import { AttendanceOverview } from "@/components/attendance/attendance-overview";
import {
  getAttendancePageData,
  parseAttendanceFilters,
} from "@/lib/attendance";

type AttendancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendancePage(props: AttendancePageProps) {
  const filters = parseAttendanceFilters(await props.searchParams);
  const pageData = await getAttendancePageData(filters);

  return <AttendanceOverview filters={filters} pageData={pageData} />;
}
