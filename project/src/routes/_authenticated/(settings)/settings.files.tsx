import { createFileRoute } from '@tanstack/react-router';
import { FileManagement } from '@/components/FileManagement/FileManagement';

export const Route = createFileRoute('/_authenticated/(settings)/settings/files')({
  component: FilesPage,
});

function FilesPage() {
  return <FileManagement />;
}
