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
  models,
  sessions,
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

function buildAssetTag(pillarPrefix: string, categoryPrefix: string, sequence: number) {
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

function validationState(message: string, errors?: RegisterAssetActionState['errors']): RegisterAssetActionState {
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

    if (currentUser.role !== 'GlobalAdmin' && currentUser.role !== 'ITOperator') {
      return unauthorizedState('Forbidden: You do not have permission to register assets.');
    }

    const parsed = parseRegistrationInput(formData);

    if (!parsed.success) {
      return validationState('Please correct the highlighted fields and try again.', parsed.error.flatten().fieldErrors);
    }

    const invoiceFile = toFormFile(formData, 'invoiceFile');
    const invoiceFileError = validateInvoiceFile(invoiceFile);

    if (invoiceFileError) {
      return validationState('Please correct the highlighted fields and try again.', {
        invoiceFile: [invoiceFileError],
      });
    }

    const input = parsed.data;
    const normalizedDbPillar = input.pillar;

    const [categoryRecord, brandRecord, modelRecord, vendorRecord, ownerRecord, duplicateSerialRecord] =
      await Promise.all([
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
        return validationState('Please correct the highlighted fields and try again.', {
          invoiceFile: ['Unable to upload invoice PDF. Please try again.'],
        });
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
