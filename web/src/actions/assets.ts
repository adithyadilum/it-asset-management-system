'use server';

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { and, eq, isNull, like, sql } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { db } from '@/db';
import {
  assetAssignments,
  assetPurchases,
  assets,
  brands,
  categories,
  locations,
  maintenanceRecords,
  models,
  sessions,
  systemAuditLogs,
  users,
  vendors,
} from '@/db/schema';
import { getJwtSecretKey } from '@/lib/jwt';
import { logError, logLatency, startLatencyTimer } from '@/lib/latency';
import { isValidUuid } from '@/lib/uuid';
import {
  registrationSchema,
  type DbPillar,
  type RegisterAssetActionState,
} from '@/validations/asset';
import {
  softwareRegistrationSchema,
  type RegisterSoftwareAssetActionState,
} from '@/validations/software-asset';
import {
  furnitureRegistrationSchema,
  type RegisterFurnitureAssetActionState,
} from '@/validations/furniture-asset';
import {
  officeElectronicsRegistrationSchema,
  type RegisterOfficeElectronicsAssetActionState,
} from '@/validations/office-electronics-asset';

const SESSION_COOKIE_NAME = 'session_token';
const MAX_INVOICE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const INVOICE_UPLOAD_URL_PREFIX = '/uploads/invoices';
const INVOICE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  'public',
  'uploads',
  'invoices'
);

const PILLAR_PREFIX_MAP: Record<DbPillar, string> = {
  'IT & Digital': 'HRW',
  Software: 'SFT',
  'Office Furniture': 'FUR',
  'Office Electronics': 'ELC',
};

type UserRole = typeof users.$inferSelect.role;

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

function normalizeTokenRole(role: unknown): UserRole | null {
  if (
    role === 'GlobalAdmin' ||
    role === 'ITOperator' ||
    role === 'FinanceAuditor' ||
    role === 'Employee'
  ) {
    return role;
  }

  return null;
}

async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const authTimer = startLatencyTimer();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());

    if (!isValidUuid(payload.sub)) {
      return null;
    }

    if (!payload.sid || typeof payload.sid !== 'string') {
      return null;
    }

    const role = normalizeTokenRole(payload.role);

    if (!role) {
      return null;
    }

    const activeSession = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenId, payload.sid),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (activeSession.length === 0) {
      return null;
    }

    return {
      id: payload.sub,
      role,
    };
  } catch {
    return null;
  } finally {
    logLatency({
      scope: 'ACTION AUTH',
      label: 'assets.getAuthenticatedUser',
      startTime: authTimer,
    });
  }
}

function toFormValue(formData: FormData, key: string) {
  const rawValue = formData.get(key);

  if (typeof rawValue !== 'string') {
    return '';
  }

  return rawValue;
}

function toFormFile(formData: FormData, key: string) {
  const rawValue = formData.get(key);

  if (!(rawValue instanceof File)) {
    return null;
  }

  if (rawValue.size === 0 || rawValue.name.trim().length === 0) {
    return null;
  }

  return rawValue;
}

function parseRegistrationInput(formData: FormData) {
  const rawInput = {
    name: toFormValue(formData, 'name'),
    serialNumber: toFormValue(formData, 'serialNumber'),
    categoryId: toFormValue(formData, 'categoryId'),
    brandId: toFormValue(formData, 'brandId'),
    modelId: toFormValue(formData, 'modelId'),
    ownerId: toFormValue(formData, 'ownerId'),
    purchaseDate: toFormValue(formData, 'purchaseDate'),
    basePrice: toFormValue(formData, 'basePrice'),
    shippingCost: toFormValue(formData, 'shippingCost'),
    tax: toFormValue(formData, 'tax'),
    currencyCode: toFormValue(formData, 'currencyCode'),
    warrantyMonths: toFormValue(formData, 'warrantyMonths'),
    vendorId: toFormValue(formData, 'vendorId'),
    notes: toFormValue(formData, 'notes'),
    pillar: toFormValue(formData, 'pillar'),
  };

  return registrationSchema.safeParse(rawInput);
}

function parseSoftwareRegistrationInput(formData: FormData) {
  const rawInput = {
    softwareName: toFormValue(formData, 'softwareName'),
    categoryId: toFormValue(formData, 'categoryId'),
    publisherId: toFormValue(formData, 'publisherId'),
    agreementType: toFormValue(formData, 'agreementType'),
    paymentModel: toFormValue(formData, 'paymentModel'),
    licenseKey: toFormValue(formData, 'licenseKey'),
    licenseEmail: toFormValue(formData, 'licenseEmail'),
    totalSeats: toFormValue(formData, 'totalSeats'),
    purchaseDate: toFormValue(formData, 'purchaseDate'),
    basePrice: toFormValue(formData, 'basePrice'),
    tax: toFormValue(formData, 'tax'),
    currencyCode: toFormValue(formData, 'currencyCode'),
    vendorId: toFormValue(formData, 'vendorId'),
    notes: toFormValue(formData, 'notes'),
    pillar: toFormValue(formData, 'pillar'),
  };

  return softwareRegistrationSchema.safeParse(rawInput);
}

function parseFurnitureRegistrationInput(formData: FormData) {
  const rawInput = {
    categoryId: toFormValue(formData, 'categoryId'),
    manufacturerId: toFormValue(formData, 'manufacturerId'),
    productLineId: toFormValue(formData, 'productLineId'),
    locationId: toFormValue(formData, 'locationId'),
    floor: toFormValue(formData, 'floor'),
    condition: toFormValue(formData, 'condition'),
    material: toFormValue(formData, 'material'),
    dimensions: toFormValue(formData, 'dimensions'),
    headerNote: toFormValue(formData, 'headerNote'),
    purchaseDate: toFormValue(formData, 'purchaseDate'),
    basePrice: toFormValue(formData, 'basePrice'),
    shippingCost: toFormValue(formData, 'shippingCost'),
    tax: toFormValue(formData, 'tax'),
    currencyCode: toFormValue(formData, 'currencyCode'),
    vendorId: toFormValue(formData, 'vendorId'),
    warrantyMonths: toFormValue(formData, 'warrantyMonths'),
    purchaseNote: toFormValue(formData, 'purchaseNote'),
    pillar: toFormValue(formData, 'pillar'),
  };

  return furnitureRegistrationSchema.safeParse(rawInput);
}

function parseOfficeElectronicsRegistrationInput(formData: FormData) {
  const rawInput = {
    categoryId: toFormValue(formData, 'categoryId'),
    brandId: toFormValue(formData, 'brandId'),
    serialNumber: toFormValue(formData, 'serialNumber'),
    ipOrMacAddress: toFormValue(formData, 'ipOrMacAddress'),
    locationId: toFormValue(formData, 'locationId'),
    note: toFormValue(formData, 'note'),
    purchaseDate: toFormValue(formData, 'purchaseDate'),
    basePrice: toFormValue(formData, 'basePrice'),
    shippingCost: toFormValue(formData, 'shippingCost'),
    tax: toFormValue(formData, 'tax'),
    currencyCode: toFormValue(formData, 'currencyCode'),
    vendorId: toFormValue(formData, 'vendorId'),
    warrantyMonths: toFormValue(formData, 'warrantyMonths'),
    purchaseNote: toFormValue(formData, 'purchaseNote'),
    pillar: toFormValue(formData, 'pillar'),
  };

  return officeElectronicsRegistrationSchema.safeParse(rawInput);
}

function validateInvoiceFile(file: File | null) {
  if (!file) {
    return null;
  }

  if (file.size > MAX_INVOICE_FILE_SIZE_BYTES) {
    return 'Invoice PDF must be 10MB or smaller.';
  }

  const hasPdfMimeType = file.type === 'application/pdf';
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');

  if (!hasPdfMimeType && !hasPdfExtension) {
    return 'Invoice file must be a PDF.';
  }

  return null;
}

async function saveInvoiceFile(file: File) {
  await mkdir(INVOICE_UPLOAD_DIRECTORY, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  const absolutePath = path.join(INVOICE_UPLOAD_DIRECTORY, fileName);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, fileBuffer);

  return `${INVOICE_UPLOAD_URL_PREFIX}/${fileName}`;
}

async function removeUploadedInvoice(invoiceUrl: string) {
  if (!invoiceUrl.startsWith(`${INVOICE_UPLOAD_URL_PREFIX}/`)) {
    return;
  }

  const relativeFilePath = invoiceUrl.replace(/^\//, '');
  const absoluteFilePath = path.join(process.cwd(), 'public', relativeFilePath);

  try {
    await unlink(absoluteFilePath);
  } catch {
    // Best-effort cleanup if a DB transaction fails after upload.
  }
}

function toDateString(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addMonths(value: Date, months: number) {
  const nextDate = new Date(value);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function formatSequence(value: number) {
  return String(value).padStart(3, '0');
}

function buildAssetTag(
  pillarPrefix: string,
  categoryPrefix: string,
  sequence: number
) {
  return `${pillarPrefix}-${categoryPrefix}-${formatSequence(sequence)}`;
}

function unauthorizedState(message: string): RegisterAssetActionState {
  return {
    success: false,
    message,
    errors: {
      form: [message],
    },
  };
}

function validationState(
  message: string,
  errors?: RegisterAssetActionState['errors']
): RegisterAssetActionState {
  return {
    success: false,
    message,
    errors,
  };
}

export async function registerAsset(
  _prevState: RegisterAssetActionState,
  formData: FormData
): Promise<RegisterAssetActionState> {
  const actionTimer = startLatencyTimer();
  let uploadedInvoiceUrl: string | null = null;
  let assetWasCreated = false;

  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return unauthorizedState('Please sign in to register assets.');
    }

    if (
      currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'ITOperator'
    ) {
      return unauthorizedState(
        'Forbidden: You do not have permission to register assets.'
      );
    }

    const parsed = parseRegistrationInput(formData);

    if (!parsed.success) {
      return validationState(
        'Please correct the highlighted fields and try again.',
        parsed.error.flatten().fieldErrors
      );
    }

    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return validationState(
        'Please correct the highlighted fields and try again.',
        {
          invoiceFile: [invoiceFileError],
        }
      );
    }

    const input = parsed.data;
    const normalizedDbPillar = input.pillar;

    const [
      categoryRecord,
      brandRecord,
      modelRecord,
      vendorRecord,
      ownerRecord,
      duplicateSerialRecord,
    ] = await Promise.all([
      db.query.categories.findFirst({
        where: eq(categories.id, input.categoryId),
        columns: {
          id: true,
          prefix: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.brands.findFirst({
        where: eq(brands.id, input.brandId),
        columns: {
          id: true,
          name: true,
          isActive: true,
        },
      }),
      db.query.models.findFirst({
        where: eq(models.id, input.modelId),
        columns: {
          id: true,
          categoryId: true,
          brandId: true,
          isActive: true,
        },
      }),
      db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
        columns: {
          id: true,
          pillar: true,
          isActive: true,
        },
      }),
      input.ownerId
        ? db.query.users.findFirst({
            where: eq(users.id, input.ownerId),
            columns: {
              id: true,
              isActive: true,
            },
          })
        : Promise.resolve(null),
      db.query.assets.findFirst({
        where: eq(assets.serialNumber, input.serialNumber),
        columns: {
          id: true,
          assetTag: true,
        },
      }),
    ]);

    if (!categoryRecord || !categoryRecord.isActive) {
      return validationState('Please select an active category.', {
        categoryId: ['Please select an active category.'],
      });
    }

    if (!brandRecord || !brandRecord.isActive) {
      return validationState('Please select an active brand.', {
        brandId: ['Please select an active brand.'],
      });
    }

    if (!modelRecord || !modelRecord.isActive) {
      return validationState('Please select an active model.', {
        modelId: ['Please select an active model.'],
      });
    }

    if (!vendorRecord || !vendorRecord.isActive) {
      return validationState('Please select an active vendor.', {
        vendorId: ['Please select an active vendor.'],
      });
    }

    if (vendorRecord.pillar !== normalizedDbPillar) {
      return validationState('Vendor does not belong to selected pillar.', {
        vendorId: ['Vendor does not belong to selected pillar.'],
      });
    }

    if (input.ownerId && (!ownerRecord || !ownerRecord.isActive)) {
      return validationState('Please select an active owner.', {
        ownerId: ['Please select an active owner.'],
      });
    }

    if (duplicateSerialRecord) {
      return validationState('Serial number already exists.', {
        serialNumber: [
          `Serial number is already used by ${duplicateSerialRecord.assetTag}.`,
        ],
      });
    }

    if (modelRecord.categoryId !== input.categoryId) {
      return validationState('Model does not belong to selected category.', {
        modelId: ['Model does not belong to selected category.'],
      });
    }

    if (modelRecord.brandId !== input.brandId) {
      return validationState('Model does not belong to selected brand.', {
        modelId: ['Model does not belong to selected brand.'],
      });
    }

    if (categoryRecord.pillar !== normalizedDbPillar) {
      return validationState('Category does not belong to selected pillar.', {
        pillar: ['Category does not belong to selected pillar.'],
      });
    }

    const shippingCost = input.shippingCost ?? 0;
    const tax = input.tax ?? 0;
    const totalCost = input.basePrice + shippingCost + tax;
    const currencyCode = input.currencyCode ?? 'USD';
    const warrantyExpiry = input.warrantyMonths
      ? toDateString(addMonths(input.purchaseDate, input.warrantyMonths))
      : null;

    if (invoiceFile) {
      try {
        uploadedInvoiceUrl = await saveInvoiceFile(invoiceFile);
      } catch {
        return validationState(
          'Please correct the highlighted fields and try again.',
          {
            invoiceFile: ['Unable to upload invoice PDF. Please try again.'],
          }
        );
      }
    }

    const normalizedCategoryPrefix = categoryRecord.prefix.trim().toUpperCase();
    const pillarPrefix = PILLAR_PREFIX_MAP[normalizedDbPillar];
    const assetTagPrefix = `${pillarPrefix}-${normalizedCategoryPrefix}`;

    const countResult = await db
      .select({ value: sql<number>`cast(count(*) as integer)` })
      .from(assets)
      .where(like(assets.assetTag, `${assetTagPrefix}-%`));

    const nextSequence = (countResult[0]?.value ?? 0) + 1;
    const generatedAssetTag = buildAssetTag(
      pillarPrefix,
      normalizedCategoryPrefix,
      nextSequence
    );

    let createdAssetId: string | null = null;

    try {
      const [insertedAsset] = await db
        .insert(assets)
        .values({
          assetTag: generatedAssetTag,
          serialNumber: input.serialNumber,
          name: input.name,
          modelId: input.modelId,
          instanceAttributes: input.notes ? { notes: input.notes } : null,
        })
        .returning({
          id: assets.id,
          assetTag: assets.assetTag,
        });

      if (!insertedAsset) {
        throw new Error('Unable to create asset.');
      }

      createdAssetId = insertedAsset.id;

      await db.insert(assetPurchases).values({
        assetId: insertedAsset.id,
        vendorId: input.vendorId,
        purchaseDate: toDateString(input.purchaseDate),
        basePrice: input.basePrice.toFixed(2),
        shippingCost: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        totalCost: totalCost.toFixed(2),
        currencyCode,
        warrantyExpiry,
        invoiceUrl: uploadedInvoiceUrl,
      });

      if (input.ownerId) {
        await db.insert(assetAssignments).values({
          assetId: insertedAsset.id,
          assignedToUserId: input.ownerId,
          assignedById: currentUser.id,
        });
      }

      assetWasCreated = true;

      revalidatePath('/assets');

      return {
        success: true,
        message: `Asset ${insertedAsset.assetTag} was registered successfully.`,
        assetId: insertedAsset.assetTag,
        errors: {},
      };
    } catch (writeError) {
      if (createdAssetId) {
        try {
          await db.delete(assets).where(eq(assets.id, createdAssetId));
        } catch {
          // Best-effort rollback when follow-up writes fail.
        }
      }

      throw writeError;
    }
  } catch (error) {
    if (uploadedInvoiceUrl && !assetWasCreated) {
      await removeUploadedInvoice(uploadedInvoiceUrl);
    }

    logError({
      scope: 'ACTION',
      label: 'assets.registerAsset',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while registering asset.',
      errors: {
        form: ['Unexpected error while registering asset.'],
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.registerAsset',
      startTime: actionTimer,
    });
  }
}

export async function registerSoftwareAsset(
  _prevState: RegisterSoftwareAssetActionState,
  formData: FormData
): Promise<RegisterSoftwareAssetActionState> {
  const actionTimer = startLatencyTimer();
  let uploadedInvoiceUrl: string | null = null;
  let assetWasCreated = false;
  let createdAssetId: string | null = null;

  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return {
        success: false,
        message: 'Please sign in to register software assets.',
        errors: {
          form: ['Please sign in to register software assets.'],
        },
      };
    }

    if (
      currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'ITOperator'
    ) {
      return {
        success: false,
        message:
          'Forbidden: You do not have permission to register software assets.',
        errors: {
          form: [
            'Forbidden: You do not have permission to register software assets.',
          ],
        },
      };
    }

    const parsed = parseSoftwareRegistrationInput(formData);

    if (!parsed.success) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: {
          invoiceFile: [invoiceFileError],
        },
      };
    }

    const input = parsed.data;

    const [
      categoryRecord,
      publisherRecord,
      vendorRecord,
      duplicateLicenseRecord,
      existingModel,
    ] = await Promise.all([
      db.query.categories.findFirst({
        where: eq(categories.id, input.categoryId),
        columns: {
          id: true,
          prefix: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.brands.findFirst({
        where: eq(brands.id, input.publisherId),
        columns: {
          id: true,
          isActive: true,
        },
      }),
      db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
        columns: {
          id: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.assets.findFirst({
        where: eq(assets.serialNumber, input.licenseKey),
        columns: {
          id: true,
          assetTag: true,
        },
      }),
      db.query.models.findFirst({
        where: and(
          eq(models.brandId, input.publisherId),
          eq(models.name, input.softwareName)
        ),
        columns: {
          id: true,
          categoryId: true,
          isActive: true,
        },
      }),
    ]);

    if (!categoryRecord || !categoryRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active category.',
        errors: {
          categoryId: ['Please select an active category.'],
        },
      };
    }

    if (categoryRecord.pillar !== 'Software') {
      return {
        success: false,
        message: 'Selected category does not belong to Software pillar.',
        errors: {
          categoryId: ['Selected category does not belong to Software pillar.'],
        },
      };
    }

    if (!publisherRecord || !publisherRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active publisher.',
        errors: {
          publisherId: ['Please select an active publisher.'],
        },
      };
    }

    if (!vendorRecord || !vendorRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active vendor.',
        errors: {
          vendorId: ['Please select an active vendor.'],
        },
      };
    }

    if (vendorRecord.pillar !== 'Software') {
      return {
        success: false,
        message: 'Selected vendor does not belong to Software pillar.',
        errors: {
          vendorId: ['Selected vendor does not belong to Software pillar.'],
        },
      };
    }

    if (duplicateLicenseRecord) {
      return {
        success: false,
        message: 'License key already exists.',
        errors: {
          licenseKey: [
            `License key is already used by ${duplicateLicenseRecord.assetTag}.`,
          ],
        },
      };
    }

    if (existingModel && existingModel.categoryId !== input.categoryId) {
      return {
        success: false,
        message: 'Software model exists under a different category.',
        errors: {
          softwareName: ['Software model exists under a different category.'],
        },
      };
    }

    if (existingModel && !existingModel.isActive) {
      return {
        success: false,
        message: 'Software model exists but is inactive.',
        errors: {
          softwareName: ['Software model exists but is inactive.'],
        },
      };
    }

    if (invoiceFile) {
      try {
        uploadedInvoiceUrl = await saveInvoiceFile(invoiceFile);
      } catch {
        return {
          success: false,
          message: 'Please correct the highlighted fields and try again.',
          errors: {
            invoiceFile: ['Unable to upload invoice PDF. Please try again.'],
          },
        };
      }
    }

    const shippingCost = 0;
    const tax = input.tax ?? 0;
    const totalCost = input.basePrice + tax;
    const currencyCode = input.currencyCode ?? 'USD';

    const resolvedModelId = existingModel?.id
      ? existingModel.id
      : (
          await db
            .insert(models)
            .values({
              brandId: input.publisherId,
              categoryId: input.categoryId,
              name: input.softwareName,
              isActive: true,
            })
            .returning({ id: models.id })
        )[0]?.id;

    if (!resolvedModelId) {
      return {
        success: false,
        message: 'Unable to resolve software model.',
        errors: {
          softwareName: ['Unable to resolve software model.'],
        },
      };
    }

    const normalizedCategoryPrefix = categoryRecord.prefix.trim().toUpperCase();
    const pillarPrefix = PILLAR_PREFIX_MAP.Software;
    const assetTagPrefix = `${pillarPrefix}-${normalizedCategoryPrefix}`;

    const countResult = await db
      .select({ value: sql<number>`cast(count(*) as integer)` })
      .from(assets)
      .where(like(assets.assetTag, `${assetTagPrefix}-%`));

    const nextSequence = (countResult[0]?.value ?? 0) + 1;
    const generatedAssetTag = buildAssetTag(
      pillarPrefix,
      normalizedCategoryPrefix,
      nextSequence
    );

    const [insertedAsset] = await db
      .insert(assets)
      .values({
        assetTag: generatedAssetTag,
        serialNumber: input.licenseKey,
        name: input.softwareName,
        modelId: resolvedModelId,
        instanceAttributes: {
          softwareName: input.softwareName,
          agreementType: input.agreementType,
          paymentModel: input.paymentModel,
          licenseEmail: input.licenseEmail,
          totalSeats: input.totalSeats,
          notes: input.notes ?? null,
        },
      })
      .returning({
        id: assets.id,
        assetTag: assets.assetTag,
      });

    if (!insertedAsset) {
      throw new Error('Unable to create software asset.');
    }

    createdAssetId = insertedAsset.id;

    await db.insert(assetPurchases).values({
      assetId: insertedAsset.id,
      vendorId: input.vendorId,
      purchaseDate: toDateString(input.purchaseDate),
      basePrice: input.basePrice.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      totalCost: totalCost.toFixed(2),
      currencyCode,
      warrantyExpiry: null,
      invoiceUrl: uploadedInvoiceUrl,
    });

    assetWasCreated = true;

    revalidatePath('/assets');
    revalidatePath('/assets/software');

    return {
      success: true,
      message: `Software asset ${insertedAsset.assetTag} was registered successfully.`,
      assetId: insertedAsset.assetTag,
      errors: {},
    };
  } catch (error) {
    if (createdAssetId) {
      try {
        await db.delete(assets).where(eq(assets.id, createdAssetId));
      } catch {
        // Best-effort rollback if follow-up write fails.
      }
    }

    if (uploadedInvoiceUrl && !assetWasCreated) {
      await removeUploadedInvoice(uploadedInvoiceUrl);
    }

    logError({
      scope: 'ACTION',
      label: 'assets.registerSoftwareAsset',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while registering software asset.',
      errors: {
        form: ['Unexpected error while registering software asset.'],
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.registerSoftwareAsset',
      startTime: actionTimer,
    });
  }
}

export async function registerFurnitureAsset(
  _prevState: RegisterFurnitureAssetActionState,
  formData: FormData
): Promise<RegisterFurnitureAssetActionState> {
  const actionTimer = startLatencyTimer();
  let uploadedInvoiceUrl: string | null = null;
  let assetWasCreated = false;
  let createdAssetId: string | null = null;

  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return {
        success: false,
        message: 'Please sign in to register furniture assets.',
        errors: {
          form: ['Please sign in to register furniture assets.'],
        },
      };
    }

    if (
      currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'ITOperator'
    ) {
      return {
        success: false,
        message:
          'Forbidden: You do not have permission to register furniture assets.',
        errors: {
          form: [
            'Forbidden: You do not have permission to register furniture assets.',
          ],
        },
      };
    }

    const parsed = parseFurnitureRegistrationInput(formData);

    if (!parsed.success) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: {
          invoiceFile: [invoiceFileError],
        },
      };
    }

    const input = parsed.data;

    const [
      categoryRecord,
      manufacturerRecord,
      modelRecord,
      locationRecord,
      vendorRecord,
    ] = await Promise.all([
      db.query.categories.findFirst({
        where: eq(categories.id, input.categoryId),
        columns: {
          id: true,
          prefix: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.brands.findFirst({
        where: eq(brands.id, input.manufacturerId),
        columns: {
          id: true,
          isActive: true,
        },
      }),
      db.query.models.findFirst({
        where: eq(models.id, input.productLineId),
        columns: {
          id: true,
          name: true,
          categoryId: true,
          brandId: true,
          isActive: true,
        },
      }),
      db.query.locations.findFirst({
        where: eq(locations.id, input.locationId),
        columns: {
          id: true,
          isActive: true,
        },
      }),
      db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
        columns: {
          id: true,
          pillar: true,
          isActive: true,
        },
      }),
    ]);

    if (!categoryRecord || !categoryRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active category.',
        errors: {
          categoryId: ['Please select an active category.'],
        },
      };
    }

    if (categoryRecord.pillar !== 'Office Furniture') {
      return {
        success: false,
        message:
          'Selected category does not belong to Office Furniture pillar.',
        errors: {
          categoryId: [
            'Selected category does not belong to Office Furniture pillar.',
          ],
        },
      };
    }

    if (!manufacturerRecord || !manufacturerRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active manufacturer.',
        errors: {
          manufacturerId: ['Please select an active manufacturer.'],
        },
      };
    }

    if (!modelRecord || !modelRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active product line.',
        errors: {
          productLineId: ['Please select an active product line.'],
        },
      };
    }

    if (modelRecord.categoryId !== input.categoryId) {
      return {
        success: false,
        message: 'Product line does not belong to selected category.',
        errors: {
          productLineId: ['Product line does not belong to selected category.'],
        },
      };
    }

    if (modelRecord.brandId !== input.manufacturerId) {
      return {
        success: false,
        message: 'Product line does not belong to selected manufacturer.',
        errors: {
          productLineId: [
            'Product line does not belong to selected manufacturer.',
          ],
        },
      };
    }

    if (!locationRecord || !locationRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active location.',
        errors: {
          locationId: ['Please select an active location.'],
        },
      };
    }

    if (!vendorRecord || !vendorRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active vendor.',
        errors: {
          vendorId: ['Please select an active vendor.'],
        },
      };
    }

    if (vendorRecord.pillar !== 'Office Furniture') {
      return {
        success: false,
        message: 'Selected vendor does not belong to Office Furniture pillar.',
        errors: {
          vendorId: [
            'Selected vendor does not belong to Office Furniture pillar.',
          ],
        },
      };
    }

    if (invoiceFile) {
      try {
        uploadedInvoiceUrl = await saveInvoiceFile(invoiceFile);
      } catch {
        return {
          success: false,
          message: 'Please correct the highlighted fields and try again.',
          errors: {
            invoiceFile: ['Unable to upload invoice PDF. Please try again.'],
          },
        };
      }
    }

    const shippingCost = input.shippingCost ?? 0;
    const tax = input.tax ?? 0;
    const totalCost = input.basePrice + shippingCost + tax;
    const currencyCode = input.currencyCode ?? 'USD';
    const warrantyExpiry = input.warrantyMonths
      ? toDateString(addMonths(input.purchaseDate, input.warrantyMonths))
      : null;

    const normalizedCategoryPrefix = categoryRecord.prefix.trim().toUpperCase();
    const pillarPrefix = PILLAR_PREFIX_MAP['Office Furniture'];
    const assetTagPrefix = `${pillarPrefix}-${normalizedCategoryPrefix}`;

    const countResult = await db
      .select({ value: sql<number>`cast(count(*) as integer)` })
      .from(assets)
      .where(like(assets.assetTag, `${assetTagPrefix}-%`));

    const nextSequence = (countResult[0]?.value ?? 0) + 1;
    const generatedAssetTag = buildAssetTag(
      pillarPrefix,
      normalizedCategoryPrefix,
      nextSequence
    );

    const [insertedAsset] = await db
      .insert(assets)
      .values({
        assetTag: generatedAssetTag,
        serialNumber: null,
        name: modelRecord.name,
        modelId: input.productLineId,
        locationId: input.locationId,
        condition: input.condition,
        instanceAttributes: {
          floor: input.floor,
          material: input.material,
          dimensions: input.dimensions,
          headerNote: input.headerNote ?? null,
          purchaseNote: input.purchaseNote ?? null,
        },
      })
      .returning({
        id: assets.id,
        assetTag: assets.assetTag,
      });

    if (!insertedAsset) {
      throw new Error('Unable to create furniture asset.');
    }

    createdAssetId = insertedAsset.id;

    await db.insert(assetPurchases).values({
      assetId: insertedAsset.id,
      vendorId: input.vendorId,
      purchaseDate: toDateString(input.purchaseDate),
      basePrice: input.basePrice.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      totalCost: totalCost.toFixed(2),
      currencyCode,
      warrantyExpiry,
      invoiceUrl: uploadedInvoiceUrl,
    });

    assetWasCreated = true;

    revalidatePath('/assets');
    revalidatePath('/assets/furniture');

    return {
      success: true,
      message: `Furniture asset ${insertedAsset.assetTag} was registered successfully.`,
      assetId: insertedAsset.assetTag,
      errors: {},
    };
  } catch (error) {
    if (createdAssetId) {
      try {
        await db.delete(assets).where(eq(assets.id, createdAssetId));
      } catch {
        // Best-effort rollback if follow-up write fails.
      }
    }

    if (uploadedInvoiceUrl && !assetWasCreated) {
      await removeUploadedInvoice(uploadedInvoiceUrl);
    }

    logError({
      scope: 'ACTION',
      label: 'assets.registerFurnitureAsset',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while registering furniture asset.',
      errors: {
        form: ['Unexpected error while registering furniture asset.'],
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.registerFurnitureAsset',
      startTime: actionTimer,
    });
  }
}

export async function registerOfficeElectronicsAsset(
  _prevState: RegisterOfficeElectronicsAssetActionState,
  formData: FormData
): Promise<RegisterOfficeElectronicsAssetActionState> {
  const actionTimer = startLatencyTimer();
  let uploadedInvoiceUrl: string | null = null;
  let assetWasCreated = false;
  let createdAssetId: string | null = null;

  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return {
        success: false,
        message: 'Please sign in to register office electronics assets.',
        errors: {
          form: ['Please sign in to register office electronics assets.'],
        },
      };
    }

    if (
      currentUser.role !== 'GlobalAdmin' &&
      currentUser.role !== 'ITOperator'
    ) {
      return {
        success: false,
        message:
          'Forbidden: You do not have permission to register office electronics assets.',
        errors: {
          form: [
            'Forbidden: You do not have permission to register office electronics assets.',
          ],
        },
      };
    }

    const parsed = parseOfficeElectronicsRegistrationInput(formData);

    if (!parsed.success) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return {
        success: false,
        message: 'Please correct the highlighted fields and try again.',
        errors: {
          invoiceFile: [invoiceFileError],
        },
      };
    }

    const input = parsed.data;

    const [
      categoryRecord,
      brandRecord,
      locationRecord,
      vendorRecord,
      duplicateSerialRecord,
      existingModel,
    ] = await Promise.all([
      db.query.categories.findFirst({
        where: eq(categories.id, input.categoryId),
        columns: {
          id: true,
          prefix: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.brands.findFirst({
        where: eq(brands.id, input.brandId),
        columns: {
          id: true,
          name: true,
          isActive: true,
        },
      }),
      db.query.locations.findFirst({
        where: eq(locations.id, input.locationId),
        columns: {
          id: true,
          isActive: true,
        },
      }),
      db.query.vendors.findFirst({
        where: eq(vendors.id, input.vendorId),
        columns: {
          id: true,
          pillar: true,
          isActive: true,
        },
      }),
      db.query.assets.findFirst({
        where: eq(assets.serialNumber, input.serialNumber),
        columns: {
          id: true,
          assetTag: true,
        },
      }),
      db.query.models.findFirst({
        where: and(
          eq(models.brandId, input.brandId),
          eq(models.categoryId, input.categoryId)
        ),
        columns: {
          id: true,
          isActive: true,
        },
      }),
    ]);

    if (!categoryRecord || !categoryRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active category.',
        errors: {
          categoryId: ['Please select an active category.'],
        },
      };
    }

    if (categoryRecord.pillar !== 'Office Electronics') {
      return {
        success: false,
        message:
          'Selected category does not belong to Office Electronics pillar.',
        errors: {
          categoryId: [
            'Selected category does not belong to Office Electronics pillar.',
          ],
        },
      };
    }

    if (!brandRecord || !brandRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active brand.',
        errors: {
          brandId: ['Please select an active brand.'],
        },
      };
    }

    if (!locationRecord || !locationRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active location.',
        errors: {
          locationId: ['Please select an active location.'],
        },
      };
    }

    if (!vendorRecord || !vendorRecord.isActive) {
      return {
        success: false,
        message: 'Please select an active vendor.',
        errors: {
          vendorId: ['Please select an active vendor.'],
        },
      };
    }

    if (vendorRecord.pillar !== 'Office Electronics') {
      return {
        success: false,
        message:
          'Selected vendor does not belong to Office Electronics pillar.',
        errors: {
          vendorId: [
            'Selected vendor does not belong to Office Electronics pillar.',
          ],
        },
      };
    }

    if (duplicateSerialRecord) {
      return {
        success: false,
        message: 'Serial number already exists.',
        errors: {
          serialNumber: [
            `Serial number is already used by ${duplicateSerialRecord.assetTag}.`,
          ],
        },
      };
    }

    if (existingModel && !existingModel.isActive) {
      return {
        success: false,
        message: 'Model exists but is inactive.',
        errors: {
          brandId: ['Model exists but is inactive.'],
        },
      };
    }

    if (invoiceFile) {
      try {
        uploadedInvoiceUrl = await saveInvoiceFile(invoiceFile);
      } catch {
        return {
          success: false,
          message: 'Please correct the highlighted fields and try again.',
          errors: {
            invoiceFile: ['Unable to upload invoice PDF. Please try again.'],
          },
        };
      }
    }

    const shippingCost = input.shippingCost ?? 0;
    const tax = input.tax ?? 0;
    const totalCost = input.basePrice + shippingCost + tax;
    const currencyCode = input.currencyCode ?? 'USD';
    const warrantyExpiry = input.warrantyMonths
      ? toDateString(addMonths(input.purchaseDate, input.warrantyMonths))
      : null;

    const resolvedModelId = existingModel?.id
      ? existingModel.id
      : (
          await db
            .insert(models)
            .values({
              brandId: input.brandId,
              categoryId: input.categoryId,
              name: `${categoryRecord.prefix} Standard`,
              isActive: true,
            })
            .returning({ id: models.id })
        )[0]?.id;

    if (!resolvedModelId) {
      return {
        success: false,
        message: 'Unable to resolve office electronics model.',
        errors: {
          brandId: ['Unable to resolve office electronics model.'],
        },
      };
    }

    const normalizedCategoryPrefix = categoryRecord.prefix.trim().toUpperCase();
    const pillarPrefix = PILLAR_PREFIX_MAP['Office Electronics'];
    const assetTagPrefix = `${pillarPrefix}-${normalizedCategoryPrefix}`;

    const countResult = await db
      .select({ value: sql<number>`cast(count(*) as integer)` })
      .from(assets)
      .where(like(assets.assetTag, `${assetTagPrefix}-%`));

    const nextSequence = (countResult[0]?.value ?? 0) + 1;
    const generatedAssetTag = buildAssetTag(
      pillarPrefix,
      normalizedCategoryPrefix,
      nextSequence
    );

    const [insertedAsset] = await db
      .insert(assets)
      .values({
        assetTag: generatedAssetTag,
        serialNumber: input.serialNumber,
        name: `${brandRecord.name} ${input.serialNumber}`,
        modelId: resolvedModelId,
        locationId: input.locationId,
        instanceAttributes: {
          ipOrMacAddress: input.ipOrMacAddress,
          note: input.note ?? null,
          purchaseNote: input.purchaseNote ?? null,
        },
      })
      .returning({
        id: assets.id,
        assetTag: assets.assetTag,
      });

    if (!insertedAsset) {
      throw new Error('Unable to create office electronics asset.');
    }

    createdAssetId = insertedAsset.id;

    await db.insert(assetPurchases).values({
      assetId: insertedAsset.id,
      vendorId: input.vendorId,
      purchaseDate: toDateString(input.purchaseDate),
      basePrice: input.basePrice.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      tax: tax.toFixed(2),
      totalCost: totalCost.toFixed(2),
      currencyCode,
      warrantyExpiry,
      invoiceUrl: uploadedInvoiceUrl,
    });

    assetWasCreated = true;

    revalidatePath('/assets');
    revalidatePath('/assets/office-electronics');

    return {
      success: true,
      message: `Office electronics asset ${insertedAsset.assetTag} was registered successfully.`,
      assetId: insertedAsset.assetTag,
      errors: {},
    };
  } catch (error) {
    if (createdAssetId) {
      try {
        await db.delete(assets).where(eq(assets.id, createdAssetId));
      } catch {
        // Best-effort rollback if follow-up write fails.
      }
    }

    if (uploadedInvoiceUrl && !assetWasCreated) {
      await removeUploadedInvoice(uploadedInvoiceUrl);
    }

    logError({
      scope: 'ACTION',
      label: 'assets.registerOfficeElectronicsAsset',
      error,
    });

    return {
      success: false,
      message: 'Unexpected error while registering office electronics asset.',
      errors: {
        form: ['Unexpected error while registering office electronics asset.'],
      },
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'assets.registerOfficeElectronicsAsset',
      startTime: actionTimer,
    });
  }
}

export interface AssetDetailsData {
  asset: {
    id: string;
    assetTag: string;
    serialNumber: string | null;
    name: string | null;
    status: string;
    condition: string | null;
    instanceAttributes: Record<string, unknown> | null;
    usefulLifeMonths: number | null;
    salvageValue: string | null;
    createdAt: string;
    updatedAt: string;
  };
  model: {
    id: number;
    name: string;
    technicalDetails: Record<string, unknown> | null;
    brand: { id: number; name: string };
    category: {
      id: number;
      name: string;
      pillar: string;
      prefix: string;
      customSchema: Record<string, unknown> | null;
    };
  };
  location: {
    id: number;
    name: string;
    type: string | null;
  } | null;
  purchase: {
    id: number;
    purchaseDate: string | null;
    basePrice: string | null;
    tax: string | null;
    shippingCost: string | null;
    totalCost: string | null;
    currencyCode: string;
    warrantyExpiry: string | null;
    invoiceUrl: string | null;
    createdAt: string;
  } | null;
  vendor: {
    id: number;
    companyName: string;
    contactInfo: string | null;
  } | null;
  assignment: {
    assignedToUser: {
      id: string;
      name: string;
      email: string;
    } | null;
    assignedDate: string;
    expectedReturnDate: string | null;
    notes: string | null;
  } | null;
}

export interface HistoryEvent {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  description: string;
  details?: string;
}

export interface MaintenanceEvent {
  id: number;
  assetId: string;
  vendorId: number | null;
  status: string;
  description: string;
  rmaTicketNumber: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  serviceDate: string | null;
  closedAt: string | null;
  createdAt: string;
  vendor: { companyName: string } | null;
}

const ACTION_TYPE_MAP: Record<string, string> = {
  UPDATE: 'Status Updated',
  CREATE: 'Asset Created',
  ASSIGN: 'Asset Assigned',
  RETURN: 'Asset Transferred',
  MAINTENANCE: 'Maintenance Initiated',
  DELETE: 'Asset Deleted',
};

const ACTION_DESCRIPTION_MAP: Record<string, string> = {
  UPDATE: 'Asset information was updated',
  CREATE: 'Asset was created in the system',
  ASSIGN: 'Asset was assigned to a user',
  RETURN: 'Asset was returned or transferred',
  MAINTENANCE: 'Maintenance was initiated',
  DELETE: 'Asset was deleted',
};

export async function getAssetDetails(
  assetTag: string
): Promise<AssetDetailsData | null> {
  const assetRecord = await db.query.assets.findFirst({
    where: eq(assets.assetTag, assetTag),
    with: {
      model: {
        with: {
          brand: { columns: { id: true, name: true } },
          category: {
            columns: {
              id: true,
              name: true,
              pillar: true,
              prefix: true,
              customSchema: true,
            },
          },
        },
      },
      location: { columns: { id: true, name: true, type: true } },
      purchases: {
        limit: 1,
        with: {
          vendor: {
            columns: { id: true, companyName: true, email: true, phone: true },
          },
        },
      },
      assignments: {
        limit: 1,
        orderBy: (assignments, { desc }) => [desc(assignments.assignedDate)],
        with: {
          assignedToUser: { columns: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!assetRecord) {
    return null;
  }

  const purchaseRecord = assetRecord.purchases?.[0];
  const assignmentRecord = assetRecord.assignments?.[0];

  return {
    asset: {
      id: assetRecord.id,
      assetTag: assetRecord.assetTag,
      serialNumber: assetRecord.serialNumber,
      name: assetRecord.name,
      status: assetRecord.status,
      condition: assetRecord.condition,
      instanceAttributes: assetRecord.instanceAttributes as Record<
        string,
        unknown
      > | null,
      usefulLifeMonths: assetRecord.usefulLifeMonths,
      salvageValue: assetRecord.salvageValue?.toString() ?? null,
      createdAt: assetRecord.createdAt.toISOString(),
      updatedAt: assetRecord.updatedAt.toISOString(),
    },
    model: {
      id: assetRecord.model.id,
      name: assetRecord.model.name,
      technicalDetails: assetRecord.model.technicalDetails as Record<
        string,
        unknown
      > | null,
      brand: {
        id: assetRecord.model.brand.id,
        name: assetRecord.model.brand.name,
      },
      category: {
        id: assetRecord.model.category.id,
        name: assetRecord.model.category.name,
        pillar: assetRecord.model.category.pillar,
        prefix: assetRecord.model.category.prefix,
        customSchema: assetRecord.model.category.customSchema as Record<
          string,
          unknown
        > | null,
      },
    },
    location: assetRecord.location
      ? {
          id: assetRecord.location.id,
          name: assetRecord.location.name,
          type: assetRecord.location.type,
        }
      : null,
    purchase: purchaseRecord
      ? {
          id: purchaseRecord.id,
          purchaseDate: purchaseRecord.purchaseDate?.toString() ?? null,
          basePrice: purchaseRecord.basePrice?.toString() ?? null,
          tax: purchaseRecord.tax?.toString() ?? null,
          shippingCost: purchaseRecord.shippingCost?.toString() ?? null,
          totalCost: purchaseRecord.totalCost?.toString() ?? null,
          currencyCode: purchaseRecord.currencyCode ?? 'USD',
          warrantyExpiry: purchaseRecord.warrantyExpiry?.toString() ?? null,
          invoiceUrl: purchaseRecord.invoiceUrl,
          createdAt: purchaseRecord.createdAt.toISOString(),
        }
      : null,
    vendor: purchaseRecord?.vendor
      ? {
          id: purchaseRecord.vendor.id,
          companyName: purchaseRecord.vendor.companyName,
          contactInfo:
            purchaseRecord.vendor.email ?? purchaseRecord.vendor.phone ?? null,
        }
      : null,
    assignment: assignmentRecord
      ? {
          assignedToUser: assignmentRecord.assignedToUser
            ? {
                id: assignmentRecord.assignedToUser.id,
                name: assignmentRecord.assignedToUser.name,
                email: assignmentRecord.assignedToUser.email,
              }
            : null,
          assignedDate: assignmentRecord.assignedDate.toISOString(),
          expectedReturnDate:
            assignmentRecord.expectedReturnDate?.toString() ?? null,
          notes: assignmentRecord.notes,
        }
      : null,
  };
}

export async function getAssetHistory(
  assetTag: string
): Promise<HistoryEvent[]> {
  const asset = await db.query.assets.findFirst({
    where: eq(assets.assetTag, assetTag),
    columns: { id: true },
  });

  if (!asset) {
    return [];
  }

  const auditRecords = await db.query.systemAuditLogs.findMany({
    where: and(
      eq(systemAuditLogs.entityType, 'Asset'),
      eq(systemAuditLogs.entityId, asset.id)
    ),
    orderBy: (logs, { desc }) => [desc(logs.performedAt)],
    limit: 20,
    with: { performedBy: { columns: { id: true, name: true, role: true } } },
  });

  return auditRecords.map((record) => ({
    id: String(record.id),
    timestamp: formatTimestamp(record.performedAt),
    eventType: ACTION_TYPE_MAP[record.actionType] ?? 'Status Updated',
    actor: `${record.performedBy?.name ?? 'Unknown'} (${record.performedBy?.role ?? 'User'})`,
    description:
      ACTION_DESCRIPTION_MAP[record.actionType] ?? 'Asset was modified',
    details: formatAuditDetails(
      record.oldValue as Record<string, unknown> | null,
      record.newValue as Record<string, unknown> | null
    ),
  }));
}

export async function getAssetMaintenance(
  assetTag: string
): Promise<MaintenanceEvent[]> {
  const asset = await db.query.assets.findFirst({
    where: eq(assets.assetTag, assetTag),
    columns: { id: true },
  });

  if (!asset) {
    return [];
  }

  const maintenanceList = await db.query.maintenanceRecords.findMany({
    where: eq(maintenanceRecords.assetId, asset.id),
    orderBy: (records, { desc }) => [desc(records.createdAt)],
    limit: 5,
    with: { vendor: { columns: { companyName: true } } },
  });

  return maintenanceList.map((record) => ({
    id: record.id,
    assetId: record.assetId,
    vendorId: record.vendorId,
    status: record.status,
    description: record.description,
    rmaTicketNumber: record.rmaTicketNumber,
    estimatedCost: record.estimatedCost?.toString() ?? null,
    actualCost: record.actualCost?.toString() ?? null,
    serviceDate: record.serviceDate?.toString() ?? null,
    closedAt: record.closedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    vendor: record.vendor,
  }));
}

export async function updateAsset(
  assetId: string,
  data: {
    status?:
      | 'Available'
      | 'Assigned'
      | 'In Repair'
      | 'Defective'
      | 'Lost'
      | 'Retired'
      | 'Disposed';
    condition?: 'New' | 'Excellent' | 'Fair' | 'Poor' | 'Damaged' | null;
    name?: string | null;
    locationId?: number | null;
    instanceAttributes?: Record<string, unknown> | null;
  },
  userId: string
) {
  const currentAsset = await db.query.assets.findFirst({
    where: eq(assets.id, assetId),
  });

  if (!currentAsset) {
    throw new Error('Asset not found');
  }

  const [updatedAsset] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, assetId))
    .returning();

  if (updatedAsset) {
    await logAuditChange(assetId, userId, currentAsset, updatedAsset);
  }

  return updatedAsset ?? null;
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAuditDetails(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  if (!oldValue || !newValue) {
    return '';
  }

  const changes: string[] = [];
  if (oldValue.status !== newValue.status) {
    changes.push(`Status: ${oldValue.status} -> ${newValue.status}`);
  }
  if (oldValue.condition !== newValue.condition) {
    changes.push(`Condition: ${oldValue.condition} -> ${newValue.condition}`);
  }
  if (oldValue.locationId !== newValue.locationId) {
    changes.push('Location changed');
  }

  return changes.join(', ');
}

async function logAuditChange(
  assetId: string,
  userId: string,
  oldValue: unknown,
  newValue: unknown
): Promise<void> {
  await db.insert(systemAuditLogs).values({
    entityType: 'Asset',
    entityId: assetId,
    actionType: 'UPDATE',
    performedById: userId,
    oldValue: oldValue as Record<string, unknown> | null,
    newValue: newValue as Record<string, unknown> | null,
  });
}
