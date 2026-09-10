import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * A native modal <dialog> with a title and a close button. showModal() traps focus,
 * makes the page behind inert, closes on Esc and hands focus back to wherever it was.
 * Every way of closing it, Esc, the button or a click outside, ends in onClose.
 */
const ModalDialog = ({ isOpen, onClose, title, titleId, className = '', children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // closedby="any" closes the dialog on a click outside it. Safari does not support
  // that yet; there, a click whose target is the dialog element itself but which
  // lands outside its box can only have been on the backdrop.
  const handleClick = (e) => {
    const dialog = dialogRef.current;
    if (!dialog || e.target !== dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const box = dialog.getBoundingClientRect();
    const inside = box.top <= e.clientY && e.clientY <= box.bottom && box.left <= e.clientX && e.clientX <= box.right;
    if (!inside) dialog.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className={`modal-dialog ${className}`.trim()}
      closedby="any"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        {/* A plain button rather than <form method="dialog">: the page's CSP sets
            form-action 'none', and a dialog close is no place to test how each
            browser reads that */}
        <button
          type="button"
          className="ghost-control-btn"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-medium)',
            borderRadius: '50%',
            minWidth: '34px',
            minHeight: '34px',
            padding: 0
          }}
        >
          <X size={16} />
        </button>
      </div>
      {children}
    </dialog>
  );
};

export default ModalDialog;
