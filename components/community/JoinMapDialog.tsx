"use client";

import * as React from "react";
import { Globe, User, Hammer, Building2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { CountrySelector } from "./CountrySelector";

type ProfileType = "USER" | "BUILDER" | "PROJECT";

interface JoinMapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    displayName: string;
    countryCode: string;
    type: ProfileType;
    twitterHandle?: string;
    bio?: string;
    avatarUrl?: string;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  initialData?: {
    displayName?: string;
    countryCode?: string;
    type?: ProfileType;
    twitterHandle?: string;
    bio?: string;
    avatarUrl?: string;
  };
  isEdit?: boolean;
}

const TYPE_OPTIONS: {
  value: ProfileType;
  label: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
}[] = [
  {
    value: "USER",
    label: "User",
    icon: User,
    color: "border-border bg-bg-secondary text-text-secondary hover:border-text-tertiary",
    activeColor: "border-brand bg-brand-subtle text-brand",
  },
  {
    value: "BUILDER",
    label: "Builder",
    icon: Hammer,
    color: "border-border bg-bg-secondary text-text-secondary hover:border-amber-500/50",
    activeColor: "border-amber-500 bg-amber-500/10 text-amber-500",
  },
  {
    value: "PROJECT",
    label: "Project",
    icon: Building2,
    color: "border-border bg-bg-secondary text-text-secondary hover:border-accent-coral/50",
    activeColor: "border-accent-coral bg-accent-coral/10 text-accent-coral",
  },
];

export function JoinMapDialog({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  initialData,
  isEdit = false,
}: JoinMapDialogProps) {
  const [displayName, setDisplayName] = React.useState(initialData?.displayName || "");
  const [countryCode, setCountryCode] = React.useState(initialData?.countryCode || "");
  const [type, setType] = React.useState<ProfileType>(initialData?.type || "USER");
  const [twitterHandle, setTwitterHandle] = React.useState(initialData?.twitterHandle || "");
  const [bio, setBio] = React.useState(initialData?.bio || "");
  const [avatarUrl, setAvatarUrl] = React.useState(initialData?.avatarUrl || "");
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when opened with new data
  React.useEffect(() => {
    if (isOpen && initialData) {
      setDisplayName(initialData.displayName || "");
      setCountryCode(initialData.countryCode || "");
      setType(initialData.type || "USER");
      setTwitterHandle(initialData.twitterHandle || "");
      setBio(initialData.bio || "");
      setAvatarUrl(initialData.avatarUrl || "");
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Sanitize handle: strip @, URLs, spaces
  const sanitizeHandle = (raw: string) =>
    raw
      .replace(/^@/, "")
      .replace(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/?/gi, "")
      .replace(/\s/g, "")
      .replace(/^\//, "");

  const trimmedHandle = sanitizeHandle(twitterHandle);
  const isValidHandle = /^[a-zA-Z0-9_]{1,15}$/.test(trimmedHandle);
  const showHandleError = twitterHandle.length > 0 && !isValidHandle;
  const isValid = displayName.trim().length >= 2 && countryCode.length === 2 && isValidHandle;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        displayName: displayName.trim(),
        countryCode,
        type,
        twitterHandle: trimmedHandle || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-lg border border-border bg-bg-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-bg-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-subtle flex items-center justify-center">
              <Globe className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {isEdit ? "Edit Profile" : "Join HashWorld"}
              </h2>
              <p className="text-xs text-text-secondary">
                {isEdit
                  ? "Update your community profile"
                  : "Place yourself on the Hedera community map"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-sm text-error">
              {error}
            </div>
          )}

          {/* Profile Image */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Profile Image
            </label>
            <ImageUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              recommendedSize="400x400px"
              maxSizeMB={1}
            />
          </div>

          {/* Type selector - 3 options */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              I am a...
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg border text-sm font-medium transition-colors ${
                      isActive ? opt.activeColor : opt.color
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              placeholder={type === "PROJECT" ? "Project name" : "Your name or alias"}
              className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Country *
            </label>
            <CountrySelector value={countryCode} onChange={setCountryCode} />
          </div>

          {/* Twitter handle */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              X (Twitter) Handle *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
                @
              </span>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ""))}
                maxLength={30}
                placeholder="username"
                className={`w-full pl-8 pr-4 py-2 rounded-lg bg-bg-secondary border text-text-primary text-sm focus:outline-none focus:ring-2 ${
                  showHandleError
                    ? "border-error focus:ring-error/50"
                    : "border-border focus:ring-zinc-400 dark:focus:ring-zinc-600"
                }`}
              />
            </div>
            {showHandleError ? (
              <p className="text-xs text-error mt-1">
                Enter a valid X username (letters, numbers, underscore only)
              </p>
            ) : (
              <p className="text-xs text-text-secondary mt-1">
                Others will be able to follow you on X
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={2}
              placeholder={type === "PROJECT" ? "What does your project do?" : "Tell the community about yourself"}
              className="w-full px-4 py-2 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-none"
            />
            <p className="text-xs text-text-secondary mt-1 text-right">
              {bio.length}/160
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-bg-secondary/30 flex items-center justify-between">
          {/* Delete button (only in edit mode) */}
          <div>
            {isEdit && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-error">Are you sure?</span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setDeleting(true);
                      try {
                        await onDelete();
                        setConfirmDelete(false);
                        onClose();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed to delete");
                      } finally {
                        setDeleting(false);
                      }
                    }}
                    disabled={deleting}
                    className="!border-error !text-error hover:!bg-error/10 text-xs px-2 py-1"
                  >
                    {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="text-xs px-2 py-1"
                  >
                    No
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-error transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete profile
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Globe className="h-4 w-4 mr-2" />
              )}
              {isEdit ? "Save Changes" : "Join HashWorld"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
