"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";
import React from "react";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50"
          />
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] border-r border-slate-200 bg-white"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
              <Link href="/" className="font-semibold tracking-tight text-slate-900" aria-label="랜딩 페이지로 이동">
                Mejai
              </Link>
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 hover:bg-slate-50"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}