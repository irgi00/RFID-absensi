import { StudentManagement } from "@/components/students/student-management";
import { listStudentClassOptions, listStudents } from "@/lib/students";

export default async function StudentsPage() {
  const [initialData, classOptions] = await Promise.all([
    listStudents(),
    listStudentClassOptions(),
  ]);

  return <StudentManagement initialData={initialData} classOptions={classOptions} />;
}
