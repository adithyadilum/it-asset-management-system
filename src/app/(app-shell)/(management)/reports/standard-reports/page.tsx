import { StandardReportsShell } from '@/components/features/standard-reports/standard-reports-shell';
import { getStandardReportsFilterOptions } from '@/actions/standard-reports';

export default async function Page() {
  const filterOptions = await getStandardReportsFilterOptions();
  
  return <StandardReportsShell filterOptions={filterOptions} />;
}
