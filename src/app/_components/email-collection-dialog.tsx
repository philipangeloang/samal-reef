"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EmailCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmailConfirmed: (email: string) => void;
}

// Common typo patterns for email domains
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmil.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
};

// Validate email format
function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Check for common domain typos
function checkDomainTypo(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (domain && COMMON_DOMAIN_TYPOS[domain]) {
    return COMMON_DOMAIN_TYPOS[domain];
  }
  return null;
}

export function EmailCollectionDialog({
  open,
  onOpenChange,
  onEmailConfirmed,
}: EmailCollectionDialogProps) {
  const [email1, setEmail1] = useState("");
  const [email2, setEmail2] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [touched, setTouched] = useState({ email1: false, email2: false });
  const [suggestedDomain, setSuggestedDomain] = useState<string | null>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setEmail1("");
      setEmail2("");
      setConfirmed(false);
      setTouched({ email1: false, email2: false });
      setSuggestedDomain(null);
    }
  }, [open]);

  // Check for domain typos when email1 changes
  useEffect(() => {
    if (email1 && isValidEmailFormat(email1)) {
      const suggestion = checkDomainTypo(email1);
      setSuggestedDomain(suggestion);
    } else {
      setSuggestedDomain(null);
    }
  }, [email1]);

  // Normalize email (lowercase and trim)
  const normalizeEmail = (email: string): string => {
    return email.toLowerCase().trim();
  };

  // Validation checks
  const email1Normalized = normalizeEmail(email1);
  const email2Normalized = normalizeEmail(email2);
  const email1Valid = isValidEmailFormat(email1Normalized);
  const email2Valid = isValidEmailFormat(email2Normalized);
  const emailsMatch = email1Normalized === email2Normalized;
  const canProceed =
    email1Valid &&
    email2Valid &&
    emailsMatch &&
    confirmed &&
    !suggestedDomain;

  const handleContinue = () => {
    if (canProceed) {
      onEmailConfirmed(email1Normalized);
      onOpenChange(false);
    }
  };

  const handleUseSuggestion = () => {
    if (suggestedDomain) {
      const username = email1.split("@")[0];
      const correctedEmail = `${username}@${suggestedDomain}`;
      setEmail1(correctedEmail);
      setSuggestedDomain(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-cyan-400/30 bg-gradient-to-br from-[#0d1f31]/95 to-[#0a1929]/95 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-white">
            <Mail className="h-6 w-6 text-cyan-400" />
            Enter Your Email
          </DialogTitle>
          <DialogDescription className="text-cyan-100/70">
            We'll create your account automatically after payment. You'll receive
            a secure link to access your investment dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Important Notice */}
          <Alert className="border-amber-400/30 bg-amber-400/10">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-amber-100/90">
              <strong>Important:</strong> Double-check your email carefully.
              All purchase confirmations and access links will be sent to this
              address.
            </AlertDescription>
          </Alert>

          {/* Email Entry Field */}
          <div className="space-y-2">
            <Label htmlFor="email1" className="text-cyan-100">
              Email Address
            </Label>
            <Input
              id="email1"
              type="email"
              placeholder="your.email@example.com"
              value={email1}
              onChange={(e) => setEmail1(e.target.value)}
              onBlur={() => setTouched({ ...touched, email1: true })}
              className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
            />
            {touched.email1 && email1 && !email1Valid && (
              <p className="text-sm text-red-400">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Domain Typo Suggestion */}
          {suggestedDomain && (
            <Alert className="border-blue-400/30 bg-blue-400/10">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="flex items-center justify-between text-blue-100/90">
                <span>
                  Did you mean{" "}
                  <strong>
                    {email1.split("@")[0]}@{suggestedDomain}
                  </strong>
                  ?
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUseSuggestion}
                  className="ml-2 border-blue-400/40 bg-blue-400/20 text-blue-100 hover:bg-blue-400/30"
                >
                  Use This
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Email Confirmation Field */}
          <div className="space-y-2">
            <Label htmlFor="email2" className="text-cyan-100">
              Confirm Email Address
            </Label>
            <Input
              id="email2"
              type="email"
              placeholder="Re-enter your email"
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
              onBlur={() => setTouched({ ...touched, email2: true })}
              className="border-cyan-400/30 bg-[#0a1929]/50 text-white placeholder:text-cyan-100/40"
            />
            {touched.email2 && email2 && !email2Valid && (
              <p className="text-sm text-red-400">
                Please enter a valid email address
              </p>
            )}
            {touched.email2 &&
              email1Valid &&
              email2Valid &&
              !emailsMatch && (
                <p className="text-sm text-red-400">
                  Email addresses do not match
                </p>
              )}
            {email1Valid && email2Valid && emailsMatch && (
              <p className="text-sm text-green-400">✓ Emails match</p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex flex-col space-y-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="text-sm leading-relaxed text-cyan-100/90">
              I confirm that{" "}
              <strong className="text-cyan-50">{email1Normalized || "my email"}</strong>{" "}
              is correct and I have access to this email address. I understand
              all purchase confirmations and account access links will be sent here.
            </p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
                className="border-cyan-400/40 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-white"
              />
              <Label
                htmlFor="confirm"
                className="cursor-pointer text-sm font-medium text-cyan-100"
              >
                I confirm
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-cyan-400/30 bg-transparent text-cyan-100 hover:bg-cyan-400/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed}
            className="bg-gradient-to-r from-cyan-500/90 to-blue-500/90 text-white hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
          >
            Continue to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
