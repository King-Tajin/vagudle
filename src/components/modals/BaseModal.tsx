import React from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { X } from "lucide-react";
import HatIcon from "@/assets/icons/propeller-hat.svg?react";
import { useBackButtonClose, useBackGestureStyle } from "../../lib/backButton";
import strings from "../../constants/strings";

type Props = {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  handleClose: () => void;
  maxWidthClass?: string;
  headerExtra?: React.ReactNode;
  zIndexClass?: string;
};

export const BaseModal = ({
  title,
  children,
  isOpen,
  handleClose,
  maxWidthClass = "sm:max-w-sm",
  headerExtra,
  zIndexClass = "z-60",
}: Props) => {
  useBackButtonClose(isOpen, handleClose);
  const peekStyle = useBackGestureStyle(isOpen);

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className={`fixed ${zIndexClass} inset-0 overflow-y-auto`}
    >
      <div className="flex items-center justify-center min-h-screen py-10 px-4 text-center sm:block sm:p-0">
        <DialogBackdrop
          transition
          className="fixed inset-0 transition-opacity duration-200 ease-out data-closed:opacity-0 data-leave:duration-150 data-leave:ease-in"
          style={{
            background: "rgba(0,0,0,0.88)",
            opacity: peekStyle.opacity,
          }}
        />

        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>

        <DialogPanel
          transition
          className={`relative inline-block align-bottom text-left overflow-hidden shadow-xl transform transition-all duration-250 ease-out sm:my-8 sm:align-middle sm:w-full ${maxWidthClass} data-closed:opacity-0 data-closed:translate-y-4 sm:data-closed:translate-y-0 sm:data-closed:scale-95 data-leave:duration-200 data-leave:ease-in`}
          style={{
            background: "#0a0014",
            border: "4px solid",
            borderImageSlice: 1,
            borderImageSource:
              "linear-gradient(180deg, #5000aa 0%, #28007c 100%)",
            ...peekStyle,
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b-2 border-obsidian-700"
            style={{ background: "rgba(10,0,20,0.97)" }}
          >
            <div className="flex items-center gap-3">
              <HatIcon className="w-12 h-12 text-crown-gold" />
              <DialogTitle
                as="h2"
                className="font-pixel text-sm text-crown-amber tracking-widest"
              >
                {title.toUpperCase()}
              </DialogTitle>
            </div>
            {headerExtra}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 bg-obsidian-700 hover:bg-obsidian-600 text-gray-400 hover:text-white transition-colors pixel-border-sm"
              aria-label={strings.CLOSE_BUTTON_LABEL}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-5">{children}</div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
