'use client';

import { useEffect, useState } from "react";
import { IssueReviewPanel } from "./issue-review-panel";
import { getTicketForIssueReview, getVendors, resolveIssueInternally, initiateVendorRepair } from "@/actions/maintenance";
import { toast } from "sonner"; 
import type { IssueReviewPanelData, Vendor, InitiateRepairFormData } from "@/types/maintenance";

export interface IssueReviewPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: number | null;
  onSuccess?: () => void; // Optional callback to refresh the table on the main page
}

export function IssueReviewPanelWrapper({ isOpen, onClose, ticketId, onSuccess }: IssueReviewPanelWrapperProps) {
  const [data, setData] = useState<IssueReviewPanelData | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [prevTicketId, setPrevTicketId] = useState<number | null>(null);

  const [isResolving, setIsResolving] = useState(false);
  const [isInitiating, setIsInitiating] = useState(false);

  // Trigger loading state if a new ticket is opened
  useEffect(() => {
    if (isOpen && ticketId !== prevTicketId) {
      const timeoutId = setTimeout(() => {
        setPrevTicketId(ticketId);
        setIsLoading(true);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, ticketId, prevTicketId]);

  useEffect(() => {
    if (isOpen && ticketId) {
      let isMounted = true;

      // Fetch both the ticket data and the vendor list simultaneously
      Promise.all([
        getTicketForIssueReview(ticketId),
        getVendors()
      ])
        .then(([ticketRes, vendorsRes]) => {
          if (isMounted) {
            setData(ticketRes);
            setVendors(vendorsRes);
          }
        })
        .catch((error) => {
          if (isMounted) {
            console.error(error);
            toast.error("Failed to load issue review data");
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, ticketId]);

  const handleResolveInternally = async (resolutionNote: string) => {
    if (!ticketId) return;
    setIsResolving(true);
    try {
      await resolveIssueInternally(ticketId, resolutionNote);
      toast.success("Issue resolved successfully");
      onSuccess?.(); // Refresh the table
      onClose();
    } catch {
      toast.error("Failed to resolve issue");
    } finally {
      setIsResolving(false);
    }
  };

  const handleInitiateRepair = async (formData: InitiateRepairFormData) => {
    if (!data?.ticket.asset.id) return;
    setIsInitiating(true);
    try {
      await initiateVendorRepair(
        data.ticket.id,          
        data.ticket.asset.id,    
        formData.vendorId,
        formData.rmaNumber,
        formData.estimatedCost,
        formData.expectedReturnDate
      );
      toast.success("Repair initiated successfully");
      onSuccess?.(); // Refresh the table
      onClose();
    } catch {
      toast.error("Failed to initiate repair");
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <IssueReviewPanel
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      data={data}
      vendors={vendors}
      onResolveInternally={handleResolveInternally}
      onInitiateRepair={handleInitiateRepair}
      isResolvingInternally={isResolving}
      isInitiatingRepair={isInitiating}
    />
  );
}