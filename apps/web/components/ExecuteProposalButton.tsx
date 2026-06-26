"use client";

import { useEffect, useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import type { Proposal } from "@nemesis/db";
import { Button } from "./Button";

interface ExecuteProposalButtonProps {
  proposal: Proposal;
}

type TxPayload = { to?: string; data?: string; value?: string; chainId?: number; label?: string };
type MultiStepPayload = { steps?: TxPayload[] };

function getPayloadSteps(rawPayload: string): TxPayload[] {
  const parsed = JSON.parse(rawPayload) as TxPayload | MultiStepPayload;
  return Array.isArray((parsed as MultiStepPayload).steps) ? ((parsed as MultiStepPayload).steps ?? []) : [parsed as TxPayload];
}

function getCompletedStepCount(proposal: Proposal): number {
  const hashes = proposal.executionState?.completedTxHashes;
  return Array.isArray(hashes) ? hashes.length : 0;
}

export function ExecuteProposalButton({ proposal }: ExecuteProposalButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const {
    data: hash,
    error: sendError,
    isPending: isSigning,
    sendTransaction,
  } = useSendTransaction();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  // Handle successful confirmation by notifying the backend
  useEffect(() => {
    if (isConfirmed && hash) {
      setIsVerifying(true);
      fetch(`/api/proposals/${proposal.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: hash }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to verify transaction");
          }
          // The page will automatically revalidate due to Next.js revalidatePath in the API
          window.location.reload(); 
        })
        .catch((err) => {
          setVerificationError(err.message);
        })
        .finally(() => {
          setIsVerifying(false);
        });
    }
  }, [isConfirmed, hash, proposal.id]);

  const handleExecute = () => {
    if (!proposal.unsignedTxPayload) return;
    try {
      setVerificationError(null);
      const steps = getPayloadSteps(proposal.unsignedTxPayload);
      const payload = steps[getCompletedStepCount(proposal)];
      if (!payload) {
        throw new Error("No remaining transaction step");
      }
      if (payload.chainId !== 8453 || !payload.to || !/^0x[a-fA-F0-9]{40}$/.test(payload.to)) {
        throw new Error("Invalid transaction payload");
      }
      if (payload.data && !/^0x[a-fA-F0-9]*$/.test(payload.data)) {
        throw new Error("Invalid transaction calldata");
      }
      if (payload.value && !/^(0|[1-9][0-9]*)$/.test(payload.value)) {
        throw new Error("Invalid transaction value");
      }
      sendTransaction({
        chainId: 8453,
        to: payload.to as `0x${string}`,
        data: (payload.data ?? "0x") as `0x${string}`,
        value: BigInt(payload.value ?? "0"),
      });
    } catch (err) {
      setVerificationError(err instanceof Error ? err.message : "Failed to parse transaction payload");
    }
  };

  if (!proposal.unsignedTxPayload) {
    return (
      <div className="text-[10px] text-nm-muted uppercase tracking-widest2 font-mono border border-nm-border px-2 py-1">
        No Payload
      </div>
    );
  }

  let stepLabel = "Sign in wallet";
  try {
    if (proposal.unsignedTxPayload) {
      const steps = getPayloadSteps(proposal.unsignedTxPayload);
      const step = steps[getCompletedStepCount(proposal)];
      if (step?.label) stepLabel = step.label;
    }
  } catch {
    stepLabel = "Invalid payload";
  }

  const isLoading = isSigning || isConfirming || isVerifying;
  const buttonText = isSigning
    ? "Signing in Wallet..."
    : isConfirming
    ? "Broadcasting..."
    : isVerifying
    ? "Verifying..."
    : stepLabel;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="primary"
        onClick={handleExecute}
        disabled={isLoading || isConfirmed}
      >
        {buttonText}
      </Button>

      {/* Error Displays */}
      {sendError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          {sendError.message.split("\n")[0]}
        </span>
      )}
      {receiptError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          transaction failed on-chain
        </span>
      )}
      {verificationError && (
        <span className="text-[10px] text-nm-fragment-red font-mono lowercase">
          {verificationError}
        </span>
      )}
    </div>
  );
}
