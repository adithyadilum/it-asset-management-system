import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileUploadZone } from './file-upload-zone';

describe('FileUploadZone', () => {
  const defaultProps = {
    onUploadSuccess: vi.fn(),
    onUploadError: vi.fn(),
    uploadAction: vi
      .fn()
      .mockResolvedValue({ success: true, url: 'http://example.com/file.pdf' }),
  };

  it('renders correctly with default labels', () => {
    render(<FileUploadZone {...defaultProps} />);
    expect(
      screen.getByText('Drag & drop your files here, or click to browse')
    ).toBeInTheDocument();
  });

  it('shows selected files when files are dropped/selected', async () => {
    const user = userEvent.setup();
    render(<FileUploadZone {...defaultProps} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    expect(screen.getByText('hello.pdf')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /upload 1 file/i })
    ).toBeInTheDocument();
  });

  it('removes file from list when X is clicked', async () => {
    const user = userEvent.setup();
    render(<FileUploadZone {...defaultProps} />);

    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
    await user.upload(input, file);

    expect(screen.getByText('hello.pdf')).toBeInTheDocument();

    const removeBtn = screen.getByTitle('Remove file');
    await user.click(removeBtn);

    expect(screen.queryByText('hello.pdf')).not.toBeInTheDocument();
  });
});
