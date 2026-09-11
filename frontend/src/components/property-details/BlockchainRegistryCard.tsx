import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AMOY_EXPLORER,
  getReadOnlyRegistry,
  getWritableRegistry,
} from "../../blockchain/propertyRegistry";

interface BlockchainRegistryCardProps {
  property: {
    id: string;
    address: string;
    price: number;
  };
}

interface RegistrationRecord {
  // The contract creates numeric IDs, while the existing app uses Mongo IDs.
  // This small browser-side record bridges those two identifiers without a backend.
  propertyId: string;
  txHash: string;
}

type RegistryStatus =
  | "checking"
  | "not-registered"
  | "pending"
  | "registered"
  | "error";

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      shortMessage?: string;
      message?: string;
      code?: number | string;
    };

    if (candidate.code === 4001 || candidate.code === "ACTION_REJECTED") {
      return "The wallet transaction was cancelled.";
    }

    if (candidate.shortMessage) return candidate.shortMessage;
    if (candidate.message) return candidate.message;
  }

  return "Blockchain registration failed. Please try again.";
}

const BlockchainRegistryCard: React.FC<BlockchainRegistryCardProps> = ({
  property,
}) => {
  const [record, setRecord] = useState<RegistrationRecord | null>(null);
  const [status, setStatus] = useState<RegistryStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(
    // A different listing must never accidentally reuse another listing's chain record.
    () => `rechain:blockchain-property:${property.id}`,
    [property.id],
  );

  const checkRegistration = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const stored = localStorage.getItem(storageKey);

      if (!stored) {
        setRecord(null);
        setStatus("not-registered");
        return;
      }

      const parsed = JSON.parse(stored) as RegistrationRecord;
      // localStorage is only a convenience cache. The contract remains the source of truth.
      const contract = getReadOnlyRegistry();
      const onChainProperty = await contract.getProperty(
        BigInt(parsed.propertyId),
      );

      if (!onChainProperty.exists) {
        localStorage.removeItem(storageKey);
        setRecord(null);
        setStatus("not-registered");
        return;
      }

      setRecord(parsed);
      setStatus("registered");
    } catch (registrationError) {
      console.error("Unable to verify property registration:", registrationError);
      setRecord(null);
      setStatus("not-registered");
    }
  }, [storageKey]);

  useEffect(() => {
    void checkRegistration();
  }, [checkRegistration]);

  const registerProperty = async () => {
    setError(null);
    setStatus("pending");

    try {
      // This requests a wallet connection and makes sure the wallet is on Polygon Amoy.
      const contract = await getWritableRegistry();
      // Solidity uint256 values are represented by bigint in ethers v6.
      const price = BigInt(Math.round(property.price));
      const transaction = await contract.registerProperty(
        property.address,
        price,
      );
      const receipt = await transaction.wait();

      if (!receipt) {
        throw new Error("The transaction was submitted but no receipt was returned.");
      }

      let propertyId: bigint | null = null;

      // The transaction return value is not available from a UI transaction, so read
      // the PropertyRegistered event from its receipt to obtain the new on-chain ID.
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);

          if (parsedLog?.name === "PropertyRegistered") {
            propertyId = parsedLog.args.propertyId as bigint;
            break;
          }
        } catch {
          // Ignore unrelated logs in the same transaction receipt.
        }
      }

      if (propertyId === null) {
        throw new Error("The PropertyRegistered event was not found.");
      }

      const nextRecord: RegistrationRecord = {
        propertyId: propertyId.toString(),
        txHash: transaction.hash,
      };

      // Persist only public data; a website must never store wallet keys.
      localStorage.setItem(storageKey, JSON.stringify(nextRecord));
      setRecord(nextRecord);
      setStatus("registered");
    } catch (registrationError) {
      console.error("Property registration failed:", registrationError);
      setError(getErrorMessage(registrationError));
      setStatus("error");
    }
  };

  const isRegistered = status === "registered";
  const isPending = status === "pending";
  const isChecking = status === "checking";

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#E6E0DA] bg-white shadow-sm">
      <div className="border-b border-[#F0EBE6] bg-gradient-to-r from-[#FFF7F3] via-white to-[#F7FAFF] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-manrope text-sm font-bold tracking-wide text-[#A6533D]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#D4755B] text-xs text-white">⛓</span>
            BLOCKCHAIN REGISTRY
          </p>
          <h2 className="mt-1 font-manrope text-xl font-bold text-[#1F2937]">
            On-chain status
          </h2>
          <p className="mt-2 font-manrope text-sm leading-6 text-[#6B7280]">
            Immutable proof of this listing on Polygon Amoy
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 font-manrope text-xs font-bold ${
            isRegistered
              ? "bg-[#DCFCE7] text-[#166534]"
              : isPending || isChecking
                ? "bg-[#FEF3C7] text-[#92400E]"
                : "bg-[#F3F4F6] text-[#4B5563]"
          }`}
        >
          {isRegistered
            ? "Registered"
            : isPending
              ? "Pending"
              : isChecking
                ? "Checking"
                : "Not Registered"}
        </span>
      </div>
      </div>

      <div className="p-6">
      {!isRegistered && !isPending && !isChecking && (
        <div className="rounded-xl border border-[#E8E4DF] bg-[#FCFBFA] p-4">
          <p className="font-manrope text-sm font-bold text-[#374151]">Ready to create a record</p>
          <p className="mt-1 font-manrope text-xs leading-5 text-[#6B7280]">
            Your wallet becomes the initial owner. The property address and listed price are written to the testnet.
          </p>
        </div>
      )}

      {record && isRegistered && (
        <div className="mt-5 rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] p-4">
          <p className="mb-3 flex items-center gap-2 font-manrope text-sm font-bold text-[#166534]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-xs text-white">✓</span>
            Verified on-chain
          </p>
          <dl className="space-y-3 font-manrope text-sm">
            <div>
              <dt className="font-semibold text-[#166534]">Registry ID</dt>
              <dd className="mt-1 text-[#374151]">#{record.propertyId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#166534]">Transaction</dt>
              <dd className="mt-1">
                <a
                  href={`${AMOY_EXPLORER}/tx/${record.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all font-semibold text-[#2563EB] hover:underline"
                >
                  {record.txHash}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 font-manrope text-sm text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      {!isRegistered && (
        <button
          type="button"
          disabled={isPending || isChecking}
          onClick={() => void registerProperty()}
          className="mt-5 w-full rounded-xl bg-[#D4755B] px-5 py-3 font-manrope font-bold text-white transition-colors hover:bg-[#B86851] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending
            ? "Waiting for confirmation..."
            : isChecking
              ? "Checking blockchain..."
              : "Register on Blockchain"}
        </button>
      )}

      <p className="mt-3 font-manrope text-xs leading-5 text-[#9CA3AF]">
        Registration requires a Web3 wallet connected to Polygon Amoy. No
        private key is stored by this website.
      </p>
      </div>
    </section>
  );
};

export default BlockchainRegistryCard;
