import { useRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useDialogFocus } from '../useDialogFocus';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(open, dialogRef, firstRef, () => setOpen(false));

  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      <button>Outside</button>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Example" tabIndex={-1}>
          <button ref={firstRef}>First</button>
          <button disabled>Unavailable</button>
          <button>Last</button>
        </div>
      )}
    </>
  );
}

describe('useDialogFocus', () => {
  it('moves focus inside, cycles past disabled controls, and returns focus on Escape', () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    trigger.focus();
    fireEvent.click(trigger);

    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(first).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps programmatic focus from leaving the dialog', () => {
    render(<DialogHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    screen.getByRole('button', { name: 'Outside' }).focus();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });
});
