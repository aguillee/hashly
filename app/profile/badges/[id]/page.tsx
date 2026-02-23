"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Award,
  Loader2,
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Coins,
  Send,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Wallet,
  Search,
  Clock,
  XCircle,
  Check,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWalletStore } from "@/store";
import { useHederaTransactions } from "@/hooks/useHederaTransactions";
import { useInscriptionPoller } from "@/hooks/useInscriptionPoller";
import { compressImage } from "@/lib/image-compress";
import { buildHIP412Metadata } from "@/lib/hashinals";

const MIRROR_NODE = process.env.NEXT_PUBLIC_HEDERA_NETWORK?.trim() === "testnet"
  ? "https://testnet.mirrornode.hedera.com"
  : "https://mainnet.mirrornode.hedera.com";

const HASHSCAN_NETWORK = process.env.NEXT_PUBLIC_HEDERA_NETWORK?.trim() === "testnet"
  ? "testnet"
  : "mainnet";

interface BadgeClaim {
  id: string;
  walletAddress: string;
  serialNumber: number;
  status: "PENDING" | "SENT" | "CLAIMED" | "FAILED";
  txId: string | null;
  errorReason: string | null;
  createdAt: string;
}

interface BadgeDetail {
  id: string;
  eventId: string;
  hostWallet: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  imageCid: string | null;
  metadataCid: string | null;
  imageTopicId: string | null;
  metadataTopicId: string | null;
  imageInscriptionTxId: string | null;
  metadataInscriptionTxId: string | null;
  tokenId: string | null;
  status: "DRAFT" | "TOKEN_CREATED" | "MINTED" | "DISTRIBUTED" | "EXPIRED";
  supply: number;
  airdropAttempts: number;
  airdropDeadline: string | null;
  createdAt: string;
  mintedAt: string | null;
  claims: BadgeClaim[];
  event: {
    id: string;
    title: string;
    imageUrl: string | null;
    mintDate: string | null;
    endDate: string | null;
    host: string | null;
    location: string | null;
    location_type: string | null;
  } | null;
}

// Map status to current step number (1-based)
function getStepNumber(status: BadgeDetail["status"]): number {
  switch (status) {
    case "DRAFT": return 1;
    case "TOKEN_CREATED": return 2;
    case "MINTED": return 3;
    case "DISTRIBUTED": return 4;
    case "EXPIRED": return 4;
    default: return 1;
  }
}

// Detect user rejection errors from WalletConnect
function isUserRejection(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("User rejected") ||
    msg.includes("rejected") ||
    msg.includes("cancelled") ||
    msg.includes("User closed") ||
    msg.includes("Proposal expired") ||
    msg.includes("declined")
  );
}

export default function BadgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isConnected } = useWalletStore();
  const { createNFTToken, mintNFTs, airdropNFTs, inscribeFileOnChain, isExecuting, isReady } = useHederaTransactions();

  const [badge, setBadge] = React.useState<BadgeDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Form states
  const [description, setDescription] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [walletList, setWalletList] = React.useState("");

  // Accumulated wallets for minting (step 2)
  const [addedWallets, setAddedWallets] = React.useState<string[]>([]);
  const [showMintConfirm, setShowMintConfirm] = React.useState(false);
  const [hasMinted, setHasMinted] = React.useState(false);

  // Badge name is auto-generated from event title
  const badgeName = badge?.event?.title ? `${badge.event.title} Badge` : badge?.name || "";

  // File info & cost estimate
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = React.useState<string | null>(null);

  // Compression states
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [compressionTarget, setCompressionTarget] = React.useState<number | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);

  // Action states
  const [saving, setSaving] = React.useState(false);
  const [inscriptionProgress, setInscriptionProgress] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Association check states
  const [associations, setAssociations] = React.useState<Map<string, boolean>>(new Map());
  const [checkingAssociations, setCheckingAssociations] = React.useState(false);
  const [associationsChecked, setAssociationsChecked] = React.useState(false);

  const badgeId = params.id as string;

  // Inscription polling hook
  const poller = useInscriptionPoller(badgeId);

  React.useEffect(() => {
    if (!isConnected) {
      router.push("/");
      return;
    }
    loadBadge();
  }, [isConnected, badgeId]);

  // Watch poller for completion events
  React.useEffect(() => {
    if (!poller.isPolling) return;

    if (poller.phase === "image" && poller.progress >= 1) {
      poller.stopPolling();
      loadBadge();
      setActionMessage({ type: "success", text: "Image inscribed on Hedera! Now inscribe the metadata." });
    } else if (poller.phase === "metadata" && poller.progress >= 1) {
      poller.stopPolling();
      loadBadge();
      setActionMessage({ type: "success", text: "Metadata inscribed! Both inscriptions complete." });
    } else if (poller.phase === "complete") {
      poller.stopPolling();
      loadBadge();
      setActionMessage({ type: "success", text: "All inscriptions complete!" });
    }
  }, [poller.phase, poller.progress, poller.isPolling]);

  async function loadBadge() {
    try {
      setLoading(true);
      const res = await fetch(`/api/badges/${badgeId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load badge");
        return;
      }
      const data = await res.json();
      setBadge(data.badge);
      setDescription(data.badge.description || "");

      // Use HCS-1 resolver for on-chain images, fallback to imageUrl (IPFS/legacy)
      if (data.badge.imageTopicId) {
        setImagePreview(`https://kiloscribe.com/api/inscription-cdn/${data.badge.imageTopicId}?network=mainnet`);
      } else {
        setImagePreview(data.badge.imageUrl);
      }

      // Reload recovery: auto-start polling if there are pending inscriptions
      if (
        (data.badge.imageInscriptionTxId && !data.badge.imageTopicId) ||
        (data.badge.metadataInscriptionTxId && !data.badge.metadataTopicId)
      ) {
        poller.startPolling();
      }
    } catch {
      setError("Failed to load badge");
    } finally {
      setLoading(false);
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
      setImageFile(file);
      setFileSize(file.size);
      setCompressionTarget(null);

      const fileSizeKB = file.size / 1024;
      const imageCost = fileSizeKB * 0.16;
      const metadataCost = 0.5;
      setEstimatedCost((imageCost + metadataCost).toFixed(2));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompress = async (targetKB: number | null) => {
    if (!originalFile) return;

    // Restore original
    if (targetKB === null) {
      setImageFile(originalFile);
      setFileSize(originalFile.size);
      const fileSizeKB = originalFile.size / 1024;
      setEstimatedCost(((fileSizeKB * 0.16) + 0.5).toFixed(2));
      setCompressionTarget(null);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(originalFile);
      return;
    }

    setIsCompressing(true);
    try {
      const compressed = await compressImage(originalFile, targetKB);
      setImageFile(compressed);
      setFileSize(compressed.size);
      const fileSizeKB = compressed.size / 1024;
      setEstimatedCost(((fileSizeKB * 0.16) + 0.5).toFixed(2));
      setCompressionTarget(targetKB);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      setActionMessage({ type: "error", text: "Failed to compress image" });
    } finally {
      setIsCompressing(false);
    }
  };

  // Inscribe image on chain (non-blocking: sign → save txId → poll)
  const inscribeImage = async () => {
    if (!imageFile || !isReady) {
      setActionMessage({ type: "error", text: !imageFile ? "Please select an image" : "Wallet not connected" });
      return;
    }

    setActionMessage(null);
    setInscriptionProgress(null);

    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      const contentType = imageFile.type || "image/png";

      const { transactionId, jobId } = await inscribeFileOnChain(
        fileBuffer,
        contentType,
        imageFile.name,
        (step) => setInscriptionProgress(step)
      );

      setInscriptionProgress(null);

      // Save pending txId for reload recovery
      await fetch(`/api/badges/${badgeId}/register-hashinals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "image_start", transactionId: jobId || transactionId }),
      });

      poller.startPolling();
      setActionMessage({ type: "success", text: "Image signed! Inscription in progress..." });
      setImageFile(null);
      setOriginalFile(null);
    } catch (err) {
      setInscriptionProgress(null);
      if (isUserRejection(err)) {
        setActionMessage({ type: "warning", text: "Transaction rejected. You can try again." });
      } else {
        setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to inscribe image" });
      }
    }
  };

  // Inscribe metadata on chain (non-blocking: sign → save txId → poll)
  const inscribeMetadata = async () => {
    if (!badge?.imageTopicId || !isReady) {
      setActionMessage({ type: "error", text: "Image must be inscribed first" });
      return;
    }

    setActionMessage(null);
    setInscriptionProgress(null);

    try {
      const metadata = buildHIP412Metadata({
        name: badgeName,
        description: description || `Attendance badge for ${badge.event?.title || "event"}`,
        imageTopicId: badge.imageTopicId,
        imageContentType: "image/jpeg",
        attributes: [
          ...(badge.event?.title ? [{ trait_type: "Event", value: badge.event.title }] : []),
          ...(badge.event?.mintDate ? [{ trait_type: "Date", value: badge.event.mintDate }] : []),
          ...(badge.event?.location ? [{ trait_type: "Location", value: badge.event.location }] : []),
        ],
        properties: {
          event_id: badge.eventId,
        },
      });

      const metadataJson = JSON.stringify(metadata, null, 2);
      const metadataBuffer = new TextEncoder().encode(metadataJson);

      const { transactionId, jobId } = await inscribeFileOnChain(
        metadataBuffer,
        "application/json",
        "metadata.json",
        (step) => setInscriptionProgress(step)
      );

      setInscriptionProgress(null);

      await fetch(`/api/badges/${badgeId}/register-hashinals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "metadata_start", transactionId: jobId || transactionId }),
      });

      poller.startPolling();
      setActionMessage({ type: "success", text: "Metadata signed! Inscription in progress..." });
    } catch (err) {
      setInscriptionProgress(null);
      if (isUserRejection(err)) {
        setActionMessage({ type: "warning", text: "Transaction rejected. You can try again." });
      } else {
        setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to inscribe metadata" });
      }
    }
  };

  // Save description only
  const saveDescription = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/badges/${badgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setActionMessage({ type: "success", text: "Description saved!" });
      await loadBadge();
    } catch (err) {
      setActionMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const createToken = async () => {
    if (!isReady) {
      setActionMessage({ type: "error", text: "Wallet not connected" });
      return;
    }

    setActionMessage(null);
    try {
      const result = await createNFTToken({
        name: badgeName,
        symbol: "HASHLY",
        memo: description || undefined,
      });

      const res = await fetch(`/api/badges/${badgeId}/register-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: result.tokenId,
          transactionId: result.transactionId,
          description: description || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register token");
      }

      setActionMessage({ type: "success", text: `Token created! ID: ${result.tokenId}` });
      await loadBadge();
    } catch (err) {
      if (isUserRejection(err)) {
        setActionMessage({ type: "warning", text: "Transaction rejected. You can try again when ready." });
      } else {
        setActionMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to create token",
        });
      }
    }
  };

  // Add wallets to the accumulated list (no duplicates)
  const [validatingWallets, setValidatingWallets] = React.useState(false);

  const handleAddWallets = async () => {
    const rawWallets = walletList
      .split(/[\n,]/)
      .map((w) => w.trim())
      .filter((w) => /^0\.0\.\d+$/.test(w));

    // Deduplicate within the batch itself first
    const wallets = Array.from(new Set(rawWallets));
    const batchDuplicates = rawWallets.length - wallets.length;

    if (wallets.length === 0) {
      setActionMessage({ type: "error", text: "No valid wallet addresses found" });
      return;
    }

    const existingSet = new Set(addedWallets);
    const newWallets = wallets.filter((w) => !existingSet.has(w));
    const duplicateCount = (wallets.length - newWallets.length) + batchDuplicates;

    if (newWallets.length === 0) {
      setActionMessage({ type: "warning", text: "All wallets already in the list" });
      setWalletList("");
      return;
    }

    // Validate wallets against Mirror Node (must be real accounts, not tokens)
    setValidatingWallets(true);
    setActionMessage({ type: "success", text: `Validating ${newWallets.length} wallet${newWallets.length === 1 ? "" : "s"} on blockchain...` });

    const validWallets: string[] = [];
    const invalidWallets: string[] = [];

    await Promise.all(
      newWallets.map(async (wallet) => {
        try {
          const res = await fetch(
            `${MIRROR_NODE}/api/v1/accounts/${wallet}`,
            { cache: "no-store" }
          );
          if (res.ok) {
            validWallets.push(wallet);
          } else {
            invalidWallets.push(wallet);
          }
        } catch {
          invalidWallets.push(wallet);
        }
      })
    );

    setValidatingWallets(false);

    if (validWallets.length === 0) {
      setActionMessage({
        type: "error",
        text: `None of the wallets are valid Hedera accounts: ${invalidWallets.join(", ")}`,
      });
      return;
    }

    setAddedWallets((prev) => [...prev, ...validWallets]);
    setWalletList("");

    let msg = `Added ${validWallets.length} wallet${validWallets.length === 1 ? "" : "s"}`;
    if (duplicateCount > 0) {
      msg += ` (${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} removed)`;
    }
    if (invalidWallets.length > 0) {
      msg += ` · ${invalidWallets.length} invalid: ${invalidWallets.join(", ")}`;
    }
    setActionMessage({ type: invalidWallets.length > 0 ? "warning" : "success", text: msg });
  };

  // Remove a wallet from the list
  const handleRemoveWallet = (wallet: string) => {
    setAddedWallets((prev) => prev.filter((w) => w !== wallet));
  };

  const handleMintNFTs = async () => {
    if (!isReady || !badge?.tokenId) {
      setActionMessage({ type: "error", text: "Wallet not connected or token not created" });
      return;
    }

    if (!badge.metadataTopicId && !badge.metadataCid) {
      setActionMessage({ type: "error", text: "Badge metadata not inscribed on Hedera yet" });
      return;
    }

    if (addedWallets.length === 0) {
      setActionMessage({ type: "error", text: "Add wallets first" });
      return;
    }

    setActionMessage(null);
    setShowMintConfirm(false);
    try {
      // Use Hashinals URI (hcs://1/topicId) or legacy IPFS CID
      const metadataUri = badge.metadataTopicId
        ? `hcs://1/${badge.metadataTopicId}`
        : badge.metadataCid!;
      const metadata = addedWallets.map(() => metadataUri);

      const result = await mintNFTs({
        tokenId: badge.tokenId,
        metadata,
      });

      const res = await fetch(`/api/badges/${badgeId}/register-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallets: addedWallets,
          serialNumbers: result.serialNumbers,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save claims");
      }

      setActionMessage({
        type: "success",
        text: `Minted ${result.serialNumbers.length} NFTs! You can now continue to the airdrop step.`,
      });
      setHasMinted(true);
      await loadBadge();
    } catch (err) {
      if (isUserRejection(err)) {
        setActionMessage({ type: "warning", text: "Transaction rejected. You can try again when ready." });
      } else {
        setActionMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to mint",
        });
      }
    }
  };

  // ==========================================
  // ==========================================
  // CHECK ASSOCIATIONS (reads Mirror Node)
  // ==========================================
  const handleCheckAssociations = async () => {
    if (!badge?.tokenId) return;

    setCheckingAssociations(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/badges/${badgeId}/check-associations`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to check associations");
      }

      const data = await res.json();
      const newMap = new Map<string, boolean>();
      for (const a of data.associations) {
        newMap.set(a.wallet, a.associated);
      }
      setAssociations(newMap);
      setAssociationsChecked(true);

      setActionMessage({
        type: data.associatedCount > 0 ? "success" : "error",
        text: `${data.associatedCount} associated, ${data.notAssociatedCount} not associated`,
      });
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to check",
      });
    } finally {
      setCheckingAssociations(false);
    }
  };

  // ==========================================
  // BATCH AIRDROP (only to associated wallets)
  // ==========================================
  const handleBatchAirdrop = async () => {
    if (!isReady || !badge?.tokenId) {
      setActionMessage({ type: "error", text: "Wallet not connected" });
      return;
    }

    if (!associationsChecked) {
      setActionMessage({ type: "error", text: "Check associations first" });
      return;
    }

    if (badge.airdropAttempts >= 3) {
      setActionMessage({ type: "error", text: "Maximum 3 attempts reached" });
      return;
    }

    // Filter: only PENDING/FAILED claims where wallet is associated
    const eligibleClaims = badge.claims.filter(
      (c) =>
        (c.status === "PENDING" || c.status === "FAILED") &&
        associations.get(c.walletAddress) === true
    );

    if (eligibleClaims.length === 0) {
      setActionMessage({
        type: "error",
        text: "No wallets with token associated to send to",
      });
      return;
    }

    setActionMessage(null);
    try {
      const recipients = eligibleClaims.map((claim) => ({
        wallet: claim.walletAddress,
        serialNumber: claim.serialNumber,
      }));

      const result = await airdropNFTs({
        tokenId: badge.tokenId,
        recipients,
      });

      // Update claims in backend (also increments airdropAttempts)
      const res = await fetch(`/api/badges/${badgeId}/update-claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          successful: result.successful,
          failed: result.failed,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update claims");
      }

      const updateData = await res.json();

      let msg = `Sent ${result.successful.length} NFTs!`;
      if (result.failed.length > 0) {
        msg += ` ${result.failed.length} failed.`;
      }
      msg += ` (Attempt ${updateData.attemptsUsed}/3)`;

      setActionMessage({
        type: result.failed.length > 0 ? "error" : "success",
        text: msg,
      });

      // Reset association check to force re-check before next attempt
      setAssociationsChecked(false);
      setAssociations(new Map());

      await loadBadge();
    } catch (err) {
      if (isUserRejection(err)) {
        setActionMessage({
          type: "warning",
          text: "Transaction rejected. You can try again — this attempt was not counted.",
        });
      } else {
        setActionMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to airdrop",
        });
      }
    }
  };

  const copyTokenId = () => {
    if (badge?.tokenId) {
      navigator.clipboard.writeText(badge.tokenId);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Deadline calculations
  const deadlineDate = badge?.airdropDeadline ? new Date(badge.airdropDeadline) : null;
  const now = new Date();
  const remainingMs = deadlineDate ? deadlineDate.getTime() - now.getTime() : null;
  const remainingDays = remainingMs !== null ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : null;
  const isDeadlineClose = remainingDays !== null && remainingDays <= 3;
  const isDeadlinePassed = remainingDays !== null && remainingDays <= 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !badge) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-error" />
        <p className="text-text-secondary">{error || "Badge not found"}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const currentStep = getStepNumber(badge.status);
  const pendingClaims = badge.claims.filter((c) => c.status === "PENDING" || c.status === "FAILED").length;
  const failedClaims = badge.claims.filter((c) => c.status === "FAILED").length;
  const sentClaims = badge.claims.filter((c) => c.status === "SENT" || c.status === "CLAIMED").length;
  const associatedCount = Array.from(associations.values()).filter(Boolean).length;
  const notAssociatedCount = Array.from(associations.values()).filter((v) => !v).length;

  const steps = [
    { step: 1, label: "Setup", desc: "Metadata & token creation" },
    { step: 2, label: "Mint", desc: "Mint NFTs for attendees" },
    { step: 3, label: "Airdrop", desc: "Send to wallets" },
    { step: 4, label: "Done", desc: "Distribution complete" },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </button>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Badge Image */}
          <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-bg-secondary flex-shrink-0 border border-border">
            {imagePreview ? (
              <Image
                src={imagePreview}
                alt={badge.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Award className="h-12 w-12 text-accent-primary" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{badgeName}</h1>
              <Badge
                variant={
                  badge.status === "DISTRIBUTED"
                    ? "success"
                    : badge.status === "EXPIRED"
                    ? "error"
                    : badge.status === "MINTED"
                    ? "coral"
                    : "secondary"
                }
              >
                {badge.status.replace("_", " ")}
              </Badge>
            </div>

            <p className="text-text-secondary mb-3">{badge.event?.title}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
              {badge.event?.mintDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(badge.event.mintDate)}
                </span>
              )}
              {badge.event?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {badge.event.location}
                </span>
              )}
              {badge.supply > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {badge.supply} minted
                </span>
              )}
            </div>

            {badge.tokenId && (
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-text-secondary">Token ID:</span>
                <code className="text-xs bg-bg-secondary px-2 py-1 rounded">
                  {badge.tokenId}
                </code>
                <button onClick={copyTokenId} className="text-accent-primary hover:text-accent-secondary">
                  <Copy className="h-3 w-3" />
                </button>
                <a
                  href={`https://hashscan.io/${HASHSCAN_NETWORK}/token/${badge.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-secondary"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Steps - Stepper */}
        <div className="flex items-center mb-8">
          {steps.map(({ step, label, desc }, index) => {
            const isDone = step < currentStep || badge.status === "DISTRIBUTED";
            const isActive = step === currentStep && badge.status !== "DISTRIBUTED" && badge.status !== "EXPIRED";
            const isExpiredStep = badge.status === "EXPIRED" && step === 4;

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2 transition-all ${
                      isDone
                        ? "bg-success text-white"
                        : isActive
                        ? "bg-accent-primary text-white ring-4 ring-accent-primary/20"
                        : isExpiredStep
                        ? "bg-error text-white"
                        : "bg-bg-secondary border-2 border-border text-text-secondary"
                    }`}
                  >
                    {isDone ? <Check className="h-5 w-5" /> : step}
                  </div>
                  <span className={`text-xs font-semibold ${
                    isActive ? "text-accent-primary" : isDone ? "text-success" : isExpiredStep ? "text-error" : "text-text-secondary"
                  }`}>
                    {label}
                  </span>
                  <span className="text-[10px] text-text-secondary text-center hidden sm:block">{desc}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 -mt-6 mx-1 ${
                    step < currentStep || badge.status === "DISTRIBUTED" ? "bg-success" : "bg-border"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Panel */}
        <div className="rounded-lg border border-border bg-bg-card p-6">
          {/* Wallet Status */}
          {!["DISTRIBUTED", "EXPIRED"].includes(badge.status) && (
            <div className={`mb-6 p-4 rounded-lg border ${
              isReady
                ? "bg-success/10 border-success/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}>
              <div className="flex items-center gap-3">
                <Wallet className={`h-5 w-5 ${isReady ? "text-success" : "text-yellow-500"}`} />
                <div>
                  <p className={`font-medium ${isReady ? "text-success" : "text-yellow-500"}`}>
                    {isReady ? "Wallet Connected" : "Wallet Not Ready"}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {isReady
                      ? "Transactions will be signed by your connected wallet"
                      : "Please connect your wallet to sign transactions"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Message */}
          {actionMessage && (
            <div className={`mb-6 p-4 rounded-lg border ${
              actionMessage.type === "success"
                ? "bg-success/10 border-success/30"
                : actionMessage.type === "warning"
                ? "bg-yellow-500/10 border-yellow-500/30"
                : "bg-error/10 border-error/30"
            }`}>
              <div className="flex items-center gap-2">
                {actionMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                ) : actionMessage.type === "warning" ? (
                  <RefreshCw className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-error flex-shrink-0" />
                )}
                <p className={`text-sm ${
                  actionMessage.type === "success" ? "text-success" :
                  actionMessage.type === "warning" ? "text-yellow-500" :
                  "text-error"
                }`}>
                  {actionMessage.text}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Setup */}
          {badge.status === "DRAFT" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-text-primary text-lg">Step 1: Setup Badge</h3>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Badge Name
                </label>
                <div className="px-4 py-2 rounded-lg bg-bg-secondary/50 border border-border text-text-primary">
                  {badgeName}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Auto-generated from event name
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="This will be set as the token memo on Hedera"
                  className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
                <p className="text-xs text-text-secondary mt-1">
                  Stored as the token memo on Hedera (visible on-chain)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Badge Image {badge.imageTopicId && <span className="text-success text-xs">(Stored on Hedera)</span>}
                </label>

                {/* On-chain inscription status */}
                {badge.imageTopicId && !imageFile && (
                  <div className="mb-3 p-3 bg-bg-secondary rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>Image inscribed on Hedera</span>
                      <code className="text-xs bg-bg-primary px-2 py-0.5 rounded">
                        {badge.imageTopicId}
                      </code>
                    </div>
                    {badge.metadataTopicId && (
                      <div className="flex items-center gap-2 text-sm text-text-secondary mt-1">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>Metadata inscribed on Hedera</span>
                        <code className="text-xs bg-bg-primary px-2 py-0.5 rounded">
                          {badge.metadataTopicId}
                        </code>
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={poller.isPolling}
                  className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent-primary file:text-white file:cursor-pointer disabled:opacity-50"
                />
                {badge.imageTopicId && !imageFile && !poller.isPolling && (
                  <p className="text-xs text-text-secondary mt-1">
                    Select a new image to replace the current one
                  </p>
                )}

                {/* File size & estimated cost */}
                {imageFile && fileSize && (
                  <div className="mt-3 p-3 rounded-lg bg-bg-secondary border border-border space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-text-secondary">
                        File Size:{" "}
                        <span className="text-text-primary font-medium">
                          {fileSize < 1024
                            ? `${fileSize} B`
                            : fileSize < 1024 * 1024
                            ? `${(fileSize / 1024).toFixed(2)} KB`
                            : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`}
                        </span>
                      </span>
                      {estimatedCost && (
                        <span className="text-text-secondary">
                          Estimated Cost:{" "}
                          <span className="text-text-primary font-medium">
                            ~{estimatedCost} ℏ
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Compression buttons — only shown if original file > 200KB */}
                    {originalFile && originalFile.size > 200 * 1024 && (
                      <div>
                        <p className="text-xs text-text-secondary mb-2">Reduce quality to save on inscription costs:</p>
                        <div className="flex flex-wrap gap-2">
                          {[50, 100, 200].map((kb) => (
                            <button
                              key={kb}
                              onClick={() => handleCompress(kb)}
                              disabled={isCompressing}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                compressionTarget === kb
                                  ? "bg-accent-primary text-white border-accent-primary"
                                  : "bg-bg-primary border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary"
                              }`}
                            >
                              {isCompressing ? "..." : `${kb} KB (~${((kb * 0.16) + 0.5).toFixed(2)} ℏ)`}
                            </button>
                          ))}
                          <button
                            onClick={() => handleCompress(null)}
                            disabled={isCompressing}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                              compressionTarget === null
                                ? "bg-accent-primary text-white border-accent-primary"
                                : "bg-bg-primary border-border text-text-secondary hover:border-accent-primary hover:text-accent-primary"
                            }`}
                          >
                            Original
                          </button>
                        </div>
                        {compressionTarget !== null && (
                          <p className="text-xs text-text-secondary mt-1">
                            Image converted to JPEG and compressed
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Signing progress (wallet interaction) */}
              {inscriptionProgress && (
                <div className="p-3 bg-accent-primary/10 border border-accent-primary/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-accent-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{inscriptionProgress}</span>
                  </div>
                </div>
              )}

              {/* Inscription progress bar (polling) */}
              {poller.isPolling && (
                <div className="p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-accent-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-medium">
                        {poller.phase === "image" ? "Inscribing image on Hedera..." : "Inscribing metadata on Hedera..."}
                      </span>
                    </div>
                    <span className="text-accent-primary font-bold">
                      {Math.round(poller.progress * 100)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(poller.progress * 100, 2)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>
                      {poller.messages}/{poller.maxMessages} messages
                    </span>
                    {poller.maxMessages > 0 && poller.messages < poller.maxMessages && (
                      <span>
                        ~{Math.max(1, Math.ceil((poller.maxMessages - poller.messages) * 3 / 60))} min remaining
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-text-secondary">
                    You can leave this page and come back. The inscription continues in the background.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                {/* Inscribe Image button — when no image inscribed yet */}
                {!badge.imageTopicId && !poller.isPolling && (
                  <Button onClick={inscribeImage} disabled={!imageFile || !isReady || isExecuting}>
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Inscribe Image on Hedera
                  </Button>
                )}

                {/* Inscribe Metadata button — when image is done but metadata isn't */}
                {badge.imageTopicId && !badge.metadataTopicId && !poller.isPolling && (
                  <Button onClick={inscribeMetadata} disabled={!isReady || isExecuting}>
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Inscribe Metadata on Hedera
                  </Button>
                )}

                {/* Create Token button — when both inscriptions complete */}
                {badge.imageTopicId && badge.metadataTopicId && (
                  <Button
                    onClick={createToken}
                    disabled={isExecuting || !isReady}
                  >
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Coins className="h-4 w-4 mr-2" />
                    )}
                    Create Token on Hedera
                  </Button>
                )}

                {/* Save description button */}
                {badge.imageTopicId && badge.metadataTopicId && (
                  <Button onClick={saveDescription} disabled={saving} variant="outline">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Description
                  </Button>
                )}
              </div>

              {/* On-chain metadata indicator */}
              {badge.imageTopicId && badge.metadataTopicId && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                  <svg className="h-4 w-4 text-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <p className="text-xs text-success font-medium">
                    Image & metadata permanently stored on Hedera — fully on-chain, no IPFS dependency
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Token Created - Mint */}
          {badge.status === "TOKEN_CREATED" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-text-primary text-lg">Step 2: Mint NFTs for Attendees</h3>

              {/* Add wallets input (hidden after minting) */}
              {!hasMinted && (
                <>
                  <p className="text-sm text-text-secondary">
                    Add wallet addresses. You can add them in batches. Duplicates are removed automatically.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Wallet Addresses
                    </label>
                    <textarea
                      value={walletList}
                      onChange={(e) => setWalletList(e.target.value)}
                      rows={4}
                      placeholder={"0.0.123456\n0.0.789012\n0.0.345678"}
                      className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      One per line or comma-separated
                    </p>
                  </div>

                  <Button onClick={handleAddWallets} disabled={walletList.trim().length === 0 || validatingWallets} variant="outline">
                    {validatingWallets ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Users className="h-4 w-4 mr-2" />
                    )}
                    {validatingWallets ? "Validating..." : "Add Wallets"}
                  </Button>
                </>
              )}

              {/* Added wallets list */}
              {addedWallets.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary">
                    <span className="text-sm font-medium text-text-primary">
                      Wallets Added ({addedWallets.length})
                    </span>
                    {!hasMinted && (
                      <span className="text-xs text-text-secondary">Click X to remove</span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border">
                    {addedWallets.map((wallet) => (
                      <div key={wallet} className="flex items-center justify-between px-4 py-2 hover:bg-bg-secondary/50">
                        <span className="text-xs text-text-primary">{wallet}</span>
                        {!hasMinted && (
                          <button
                            onClick={() => handleRemoveWallet(wallet)}
                            className="text-text-secondary hover:text-error transition-colors p-1"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mint section */}
              {!hasMinted && addedWallets.length > 0 && (
                <>
                  {!showMintConfirm ? (
                    <Button
                      onClick={() => setShowMintConfirm(true)}
                      disabled={isExecuting || !isReady}
                      className="w-full"
                    >
                      <Coins className="h-4 w-4 mr-2" />
                      Mint {addedWallets.length} NFTs
                    </Button>
                  ) : (
                    <div className="p-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 space-y-3">
                      <p className="text-sm text-yellow-500 font-medium">
                        Are you sure? After minting you cannot add more wallets.
                      </p>
                      <p className="text-xs text-text-secondary">
                        This will mint {addedWallets.length} NFTs on Hedera.
                      </p>
                      <div className="flex gap-3">
                        <Button
                          onClick={handleMintNFTs}
                          disabled={isExecuting || !isReady}
                          className="flex-1"
                        >
                          {isExecuting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Coins className="h-4 w-4 mr-2" />
                          )}
                          Confirm Mint
                        </Button>
                        <Button
                          onClick={() => setShowMintConfirm(false)}
                          variant="outline"
                          disabled={isExecuting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Continue button (only after minting) */}
              {hasMinted && badge.claims.length > 0 && (
                <Button
                  onClick={() => loadBadge()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Continue to Airdrop
                </Button>
              )}

            </div>
          )}

          {/* ==========================================
              Step 3: MINTED - Airdrop with Association Check
              ========================================== */}
          {badge.status === "MINTED" && (
            <div className="space-y-5">
              <h3 className="font-semibold text-text-primary text-lg">Step 3: Send Airdrops</h3>

              {/* Deadline Banner */}
              {deadlineDate && (
                <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                  isDeadlinePassed
                    ? "bg-error/10 border-error/30"
                    : isDeadlineClose
                    ? "bg-yellow-500/10 border-yellow-500/30"
                    : "bg-bg-secondary border-border"
                }`}>
                  <Clock className={`h-5 w-5 flex-shrink-0 ${
                    isDeadlinePassed ? "text-error" : isDeadlineClose ? "text-yellow-500" : "text-text-secondary"
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      isDeadlinePassed ? "text-error" : isDeadlineClose ? "text-yellow-500" : "text-text-primary"
                    }`}>
                      {isDeadlinePassed
                        ? "Deadline passed"
                        : `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining`
                      }
                    </p>
                    <p className="text-xs text-text-secondary">
                      Deadline: {formatDate(badge.airdropDeadline)}
                    </p>
                  </div>
                </div>
              )}

              {/* Attempt Counter */}
              <div className="p-3 rounded-lg bg-bg-secondary border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Attempts used</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          n <= badge.airdropAttempts
                            ? "bg-accent-primary text-white"
                            : "bg-bg-primary border border-border text-text-secondary"
                        }`}
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-bg-secondary border border-border text-center">
                  <p className="text-lg font-bold text-success">{sentClaims}</p>
                  <p className="text-xs text-text-secondary">Sent</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary border border-border text-center">
                  <p className="text-lg font-bold text-accent-primary">{associationsChecked ? associatedCount : "?"}</p>
                  <p className="text-xs text-text-secondary">Associated</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-secondary border border-border text-center">
                  <p className="text-lg font-bold text-error">{associationsChecked ? notAssociatedCount : "?"}</p>
                  <p className="text-xs text-text-secondary">Not Associated</p>
                </div>
              </div>

              {/* Check Associations Button */}
              <Button
                onClick={handleCheckAssociations}
                disabled={checkingAssociations || badge.airdropAttempts >= 3}
                variant="outline"
                className="w-full"
              >
                {checkingAssociations ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {associationsChecked ? "Re-check Token Associations" : "Check Token Associations"}
              </Button>

              {/* Send Button - only enabled after check */}
              <Button
                onClick={handleBatchAirdrop}
                disabled={
                  isExecuting ||
                  !isReady ||
                  !associationsChecked ||
                  associatedCount === 0 ||
                  badge.airdropAttempts >= 3
                }
                className="w-full"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {!associationsChecked
                  ? "Check associations first"
                  : associatedCount === 0
                  ? "No wallets associated yet"
                  : `Send to ${associatedCount} Associated Wallet${associatedCount === 1 ? "" : "s"}`
                }
              </Button>

              {badge.airdropAttempts >= 3 && (
                <p className="text-sm text-error text-center">
                  Maximum 3 attempts reached. Remaining wallets will not receive the badge.
                </p>
              )}
            </div>
          )}

          {/* Step 4: Distributed */}
          {badge.status === "DISTRIBUTED" && (
            <div className="text-center py-6">
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                All Done!
              </h3>
              <p className="text-text-secondary">
                {sentClaims} Attendance Badges have been distributed to attendees.
              </p>
            </div>
          )}

          {/* Expired */}
          {badge.status === "EXPIRED" && (
            <div className="text-center py-6">
              <XCircle className="h-16 w-16 text-error mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Badge Expired
              </h3>
              <p className="text-text-secondary">
                {sentClaims} of {badge.claims.length} badges were distributed.
              </p>
              {failedClaims > 0 && (
                <p className="text-sm text-error mt-2">
                  {failedClaims} wallet{failedClaims === 1 ? "" : "s"} did not associate the token within 3 attempts.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Claims List */}
        {badge.claims.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-text-primary mb-4">
              Attendees ({badge.claims.length})
            </h3>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-secondary">
                  <tr>
                    <th className="text-left p-3 text-text-secondary font-medium">Wallet</th>
                    <th className="text-left p-3 text-text-secondary font-medium">Serial</th>
                    {associationsChecked && (
                      <th className="text-left p-3 text-text-secondary font-medium">Associated</th>
                    )}
                    <th className="text-left p-3 text-text-secondary font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {badge.claims.map((claim) => {
                    const isAlreadySent = claim.status === "SENT" || claim.status === "CLAIMED";
                    const isAssociated = associations.get(claim.walletAddress);
                    return (
                      <tr key={claim.id} className="border-t border-border">
                        <td className="p-3 text-xs">{claim.walletAddress}</td>
                        <td className="p-3">#{claim.serialNumber}</td>
                        {associationsChecked && (
                          <td className="p-3">
                            {isAlreadySent ? (
                              <span className="text-text-secondary">-</span>
                            ) : isAssociated ? (
                              <span className="text-success font-medium">Yes</span>
                            ) : (
                              <span className="text-error font-medium">No</span>
                            )}
                          </td>
                        )}
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                isAlreadySent
                                  ? "success"
                                  : claim.status === "FAILED"
                                  ? "error"
                                  : "secondary"
                              }
                            >
                              {claim.status}
                            </Badge>
                            {claim.status === "FAILED" && claim.errorReason && (
                              <span className="text-[10px] text-orange-400 truncate max-w-[150px]" title={claim.errorReason}>
                                {claim.errorReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
