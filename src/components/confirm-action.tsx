"use client";

import { Dialog } from "@base-ui/react/dialog";
import { SubmitButton } from "./submit-button";

export function ConfirmAction({
  action,
  fields,
  label,
  title,
  description,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  label: string;
  title: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={`button ${danger ? "danger" : "secondary"}`}>
        {label}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Viewport className="dialog-viewport">
          <Dialog.Popup className="dialog">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
            <form action={action} className="actions">
              {Object.entries(fields).map(([name, value]) => (
                <input key={name} name={name} type="hidden" value={value} />
              ))}
              <SubmitButton className={`button ${danger ? "danger" : ""}`}>
                {label}
              </SubmitButton>
              <Dialog.Close className="button secondary">Cancel</Dialog.Close>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
