import { useEffect, useState } from "react";
import axios from "axios";
import { FiDownload, FiUserPlus } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

interface Batch {
  _id: string;
  name: string;
}

interface Course {
  _id: string;
  name: string;
  code: string;
  batches: Batch[];
}

const palette = {
  'bg-secondary': '#FFFAF2',
  'sidebar-bg': '#E6E6FA',
  'border-soft': '#F0E6EF',
  'text-dark': '#4B0082',
  'text-muted': '#A9A9A9',
  'text-sidebar-dark': '#4B0082',
  'accent-bright-yellow': '#FFD700',
  'accent-lilac': '#C8A2C8',
};

const TeacherCourses = () => {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filteredCourses = (courses || []).filter(c => {
    if (!debouncedSearch) return true;
    return c.name.toLowerCase().includes(debouncedSearch) || c.code.toLowerCase().includes(debouncedSearch);
  });
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCourse, setEnrollCourse] = useState("");
  const [enrollBatch, setEnrollBatch] = useState("");
  const [csvStudents, setCsvStudents] = useState<{ name: string; email: string }[]>([]);
  const [, setCsvFileName] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`http://localhost:${PORT}/api/teacher/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCourses(res.data?.courses || []);
      } catch (err) {
        console.error("Failed to fetch courses", err);
        setCourses([]);
      }
    };
    fetchCourses();
  }, []);

  const handleDownloadCSV = async (course: Course, batch: Batch) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`http://localhost:${PORT}/api/teacher/batch/${batch._id}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      const students = Array.isArray(data) ? data : data.students;

      if (!Array.isArray(students)) {
        alert("Unexpected response from server.");
        return;
      }

      let csv = "Name,Email,Course,Batch\n";
      students.forEach((s: { name: string; email: string }) => {
        csv += `"${s.name}","${s.email}","${course.name}","${batch.name}"\n`;
      });

      if (students.length === 0) {
        csv += "No students enrolled,,,\n";
      }

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${course.name}_${batch.name}_students.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Could not download student list.");
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim() !== "");
      const data = lines.slice(1).map(line => {
        const [name, email] = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
        return { name, email };
      });
      setCsvStudents(data);
      setCsvFileName(file.name);
      setEnrollError("");
    };
    reader.readAsText(file);
  };

  const handleEnrollStudent = (course: string, batch: string) => {
    setEnrollCourse(course);
    setEnrollBatch(batch);
    setCsvFileName('');
    setEnrollError('');
    setCsvStudents([]);
    setShowEnrollModal(true);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (csvStudents.length === 0) {
      setEnrollError("Please upload a CSV file.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const courseObj = courses?.find(c => c.name === enrollCourse);
      const batchObj = courseObj?.batches.find(b => b.name === enrollBatch);

      if (!courseObj || !batchObj) {
        setEnrollError("Course or batch not found.");
        return;
      }

      const response = await fetch(`http://localhost:${PORT}/api/teacher/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseObj._id,
          batchId: batchObj._id,
          students: csvStudents
        })
      });

      if (!response.ok) {
        throw new Error('Failed to enroll students');
      }

      setEnrollSuccess(true);
      setTimeout(() => {
        setShowEnrollModal(false);
        setCsvStudents([]);
        setCsvFileName('');
        setEnrollError('');
        setEnrollSuccess(false);
      }, 1000);
    } catch (error) {
      console.error("Enrollment error:", error);
      setEnrollError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full h-full pt-10 pb-4">
      <h2 className="text-3xl font-extrabold mb-10 text-center drop-shadow" style={{ color: palette['text-dark'] }}>
        Courses and Batches
      </h2>
      <div className="w-full max-w-5xl">
        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses or codes..." className="w-full px-3 py-2 rounded border" />
        </div>
        {courses === null ? (
          <p className="text-center text-lg font-medium" style={{ color: palette['text-muted'] }}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-center text-lg font-semibold" style={{ color: palette['text-muted'] }}>No courses assigned yet.</p>
        ) : (
          <table className="w-full border-separate" style={{ borderSpacing: "0 16px" }}>
            <thead>
              <tr>
                <th className="py-4 px-6 rounded-l-2xl text-lg font-semibold text-center tracking-wide" style={{ backgroundColor: palette['sidebar-bg'], color: palette['text-sidebar-dark'] }}>
                  Course Name
                </th>
                <th className="py-4 px-6 text-lg font-semibold text-center tracking-wide" style={{ backgroundColor: palette['sidebar-bg'], color: palette['text-sidebar-dark'] }}>
                  Batch Name
                </th>
                <th className="py-4 px-6 rounded-r-2xl text-lg font-semibold text-center tracking-wide" style={{ backgroundColor: palette['sidebar-bg'], color: palette['text-sidebar-dark'] }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.flatMap((course) =>
                course.batches.map((batch) => (
                  <tr key={course._id + batch._id}
                    style={{
                      backgroundColor: palette['bg-secondary'],
                      boxShadow: `0 2px 10px rgba(128, 0, 128, 0.04)`,
                      color: palette['text-dark'],
                    }}
                  >
                    <td className="px-6 py-4 text-center font-medium rounded-l-xl">{course.name}</td>
                    <td className="px-6 py-4 text-center">{batch.name}</td>
                    <td className="px-6 py-4 text-center flex gap-2 justify-center rounded-r-xl">
                      <motion.button
                        className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                        style={{ backgroundColor: palette['accent-bright-yellow'], color: palette['text-dark'], boxShadow: `0 4px 15px ${palette['accent-bright-yellow']}40` }}
                        onClick={() => handleEnrollStudent(course.name, batch.name)}
                      >
                        <FiUserPlus className="text-lg" />
                        Enroll Student
                      </motion.button>
                      <motion.button
                        className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                        style={{ backgroundColor: palette['accent-lilac'], color: "#fff", boxShadow: `0 4px 15px ${palette['accent-lilac']}40` }}
                        onClick={() => handleDownloadCSV(course, batch)}
                      >
                        <FiDownload className="text-lg" />
                        Download CSV
                      </motion.button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Enroll Modal */}
      <AnimatePresence>
        {showEnrollModal && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <h3 className="text-xl font-bold mb-4" style={{ color: palette['text-dark'] }}>
                Upload CSV for {enrollCourse} - {enrollBatch}
              </h3>
              <form onSubmit={handleEnrollSubmit}>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVUpload}
                  className="mb-4 w-full border border-gray-300 p-2 rounded"
                />
                {csvStudents.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm mb-2 font-semibold" style={{ color: palette['text-muted'] }}>
                      Preview ({csvStudents.length} students):
                    </p>
                    <ul className="text-sm max-h-40 overflow-y-auto list-disc pl-5 text-gray-700">
                      {csvStudents.map((s, idx) => (
                        <li key={idx}>{s.name} ({s.email})</li>
                      ))}
                    </ul>
                  </div>
                )}
                {enrollError && (
                  <p className="text-sm text-red-600 font-semibold mb-2">{enrollError}</p>
                )}
                {enrollSuccess && (
                  <p className="text-sm text-green-600 font-semibold mb-2">Enrolled successfully!</p>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowEnrollModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium border" style={{ color: palette['text-muted'] }}>
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: palette['sidebar-bg'], color: palette['text-dark'] }}>
                    Confirm Upload
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherCourses;
