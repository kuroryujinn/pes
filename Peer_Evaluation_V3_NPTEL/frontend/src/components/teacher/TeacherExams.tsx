import { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit, FiPlus, FiSend } from "react-icons/fi";
import { FaRegTrashAlt, FaRegFilePdf, FaRegClone } from "react-icons/fa";


const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}
export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className={`
      fixed left-1/2 bottom-24 transform -translate-x-1/2
      px-6 py-3 rounded-xl shadow-lg text-white z-50
      ${type === "success" ? "bg-green-600" : "bg-red-600"}
    `}>
      {message}
    </div>
  );
}
interface Course {
  _id: string;
  name: string;
  batches: { _id: string; name: string }[];
}
interface Exam {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  numQuestions: number;
  k: number;
  // questions?: { q?: string; max?: number; questionText?: string; maxMarks?: number }[];
}

export default function TeacherExams() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const token = localStorage.getItem("token");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [allExams, setAllExams] = useState<Exam[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [k, setK] = useState(1);
  // Remove questions state, use numQuestions and questionPaperFile
  const [numQuestions, setNumQuestions] = useState<number>(1);
  const [maxMarks, setMaxMarks] = useState<number[]>([0]);
  // questionPaperFile state removed (unused)

  // Loading states
  const [allLoading, setAllLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    axios
      .get(`http://localhost:${PORT}/api/teacher/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCourses(res.data.courses))
      .catch(console.error);
  }, []);

  useEffect(() => {
    setAllLoading(true);
    axios
      .get(`http://localhost:${PORT}/api/teacher/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAllExams(res.data.exams))
      .catch(console.error)
      .finally(() => setAllLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedBatch) {
      setBatchLoading(true);
      axios
        .get(`http://localhost:${PORT}/api/teacher/courses/${selectedCourse}/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setExams(res.data.exams))
        .catch(console.error)
        .finally(() => setBatchLoading(false));
    } else {
      setExams([]);
      setBatchLoading(false);
    }
  }, [selectedCourse, selectedBatch]);

  const refreshExams = async () => {
    if (selectedCourse && selectedBatch) {
      setBatchLoading(true);
      try {
        const res = await axios.get(`http://localhost:${PORT}/api/teacher/courses/${selectedCourse}/exams`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams(res.data.exams);
      } catch (err) {
        setExams([]);
      } finally {
        setBatchLoading(false);
      }
    }
    setAllLoading(true);
    try {
      const resAll = await axios.get(`http://localhost:${PORT}/api/teacher/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllExams(resAll.data.exams);
    } catch (err) {
      setAllExams([]);
    } finally {
      setAllLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setStartTime("");
    setEndTime("");
    setK(1);
    setNumQuestions(1);
    setMaxMarks([0]);
    // questionPaperFile state removed
  };

  // Toast for ALL actions
  const toastAction = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Always send maxMarks
      await axios.post(`http://localhost:${PORT}/api/teacher/exams`, {
        title,
        startTime,
        endTime,
        k,
        numQuestions,
        maxMarks,
        course: selectedCourse,
        batch: selectedBatch,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreateOpen(false);
      resetForm();
      await refreshExams();
      toastAction("Exam created successfully!", "success");
    } catch (error: any) {
      toastAction(error.response?.data?.message || "Exam creation failed", "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editExam) return;
    try {
      await axios.put(`http://localhost:${PORT}/api/teacher/exams/${editExam._id}`, {
        title,
        startTime,
        endTime,
        k,
        numQuestions,
        maxMarks,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditOpen(false);
      setEditExam(null);
      resetForm();
      await refreshExams();
      toastAction("Exam updated successfully!", "success");
    } catch (err: any) {
      toastAction(err.response?.data?.message || "Exam update failed", "error");
    }
  };

  const openEditForm = (exam: Exam) => {
    setEditExam(exam);
    setTitle(exam.title);
    function toInputDatetime(dt: string | Date | undefined) {
      if (!dt) return "";
      const d = new Date(dt);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }
    setStartTime(toInputDatetime(exam.startTime));
    setEndTime(toInputDatetime(exam.endTime));
    setK(exam.k);
    setNumQuestions(exam.numQuestions || 1);
    setMaxMarks(((exam as any).maxMarks) || Array(exam.numQuestions).fill(0));
    // question paper file state cleared (not used)
    setEditOpen(true);
  };

  const deleteExam = async (id: string) => {
    try {
      await axios.delete(`http://localhost:${PORT}/api/teacher/exams/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshExams();
      toastAction("Exam deleted successfully!", "success");
    } catch (error: any) {
      toastAction(error.response?.data?.message || "Delete failed", "error");
    }
  };

  // Util for today
  const setToday = (setter: (val: string) => void) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setter(now.toISOString().slice(0, 16));
  };

  // Generate QR PDFs
  const handleGenerateQRs = async (examId: string) => {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/teacher/exam/${examId}/generate-qrs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to generate QR bundle");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Exam_QRs_${examId}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      toastAction("QRs generated successfully", "success");
    } catch (err) {
      toastAction("QR generation failed", "error");
    }
  };

  // Bulk Upload Scanned PDFs
  const handleBulkUploadScans = async (examId: string) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.multiple = true;
    fileInput.click();

    fileInput.onchange = async () => {
      const files = fileInput.files;
      if (!files || files.length === 0) return;

      const formData = new FormData();
      for (const file of files) {
        formData.append("scannedPdfs", file);
      }

      try {
        const response = await axios.post(
          `http://localhost:${PORT}/api/teacher/exams/${examId}/upload-scans`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        const { successCount, failureCount } = response.data;
        toastAction(`Uploaded: ${successCount} succeeded, ${failureCount} failed`, "success");
      } catch (error: any) {
        toastAction(error.response?.data?.message || "Bulk upload failed", "error");
      }
    };
  };

  // Upload Answer Key PDF
  const handleUploadAnswerKey = async (examId: string) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.click();

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("answerKeyPdf", file);

      try {
        await axios.post(`http://localhost:${PORT}/api/teacher/${examId}/answer-key`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toastAction("Answer key uploaded successfully", "success");
      } catch (error: any) {
        toastAction(error.response?.data?.message || "Upload failed", "error");
      }
    };
  };


  // Upload Question Paper PDF
  const handleUploadQuestionPaper = async (examId: string) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/pdf";
    fileInput.click();

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("questionPaperPdf", file);

      try {
        await axios.post(`http://localhost:${PORT}/api/teacher/exams/${examId}/question-paper`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toastAction("Question paper uploaded successfully", "success");
      } catch (error: any) {
        toastAction(error.response?.data?.message || "Upload failed", "error");
      }
    };
  };

  // Generate Tickets for Pending Evaluations
  const handleGenerateTickets = async (examId: string) => {
    try {
      // First: generate tickets for pending evaluations
      const response = await axios.post(
        `http://localhost:${PORT}/api/teacher/exams/${examId}/generate-pending`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toastAction(response.data.message || "Tickets created successfully", "success");

      // Second: send flagged evaluations for this exam
      try {
        const flaggedRes = await axios.post(
          `http://localhost:${PORT}/api/teacher/exams/${examId}/send-flagged-evaluations?generateTickets=true`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        toastAction(flaggedRes.data.message || "Flagged evaluations sent successfully", "success");
      } catch (flaggedErr: any) {
        let msg = flaggedErr.response?.data?.message || "Sending flagged evaluations failed";
        if (flaggedErr.response?.status === 404) {
          msg =
            flaggedErr.response?.data?.error === "Exam not found"
              ? "Exam not found."
              : flaggedErr.response?.data?.error === "No completed evaluations found"
              ? "No completed evaluations found for this exam."
              : msg;
        }
        toastAction(msg, "error");
      }
    } catch (err: any) {
      let msg = err.response?.data?.message || "Ticket generation failed";
      if (err.response?.status === 404) {
        msg =
          err.response?.data?.error === "Exam not found"
            ? "Exam not found."
            : err.response?.data?.error === "No completed evaluations found"
            ? "No completed evaluations found for this exam."
            : msg;
      }
      toastAction(msg, "error");
    }
  };

  // Table: always white background, colored actions
  function renderExamTable(data: Exam[]) {
    return (
      <table className="w-full max-w-6xl text-left border-separate border-spacing-y-4">
        <thead>
          <tr className="text-primary font-bold text-base">
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Course</th>
            <th className="px-4 py-2">Batch</th>
            <th className="px-4 py-2">Start</th>
            <th className="px-4 py-2">End</th>
            <th className="px-4 py-2">#Q</th>
            <th className="px-4 py-2">K</th>
            <th className="px-4 py-2 flex gap-3 items-center justify-center min-w-[160px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((exam) => (
            <tr key={exam._id} className="bg-white hover:bg-[#f6e6ff] transition shadow-sm rounded-xl">
              <td className="px-4 py-2 font-semibold">{exam.title}</td>
              <td className="px-4 py-2">{courses.find(c => c._id === (exam as any).course || selectedCourse)?.name || ""}</td>
              <td className="px-4 py-2">
                {courses.find(c => c._id === (exam as any).course || selectedCourse)
                  ?.batches.find(b => b._id === (exam as any).batch || selectedBatch)?.name || ""}
              </td>
              <td className="px-4 py-2">{new Date(exam.startTime).toLocaleString()}</td>
              <td className="px-4 py-2">{new Date(exam.endTime).toLocaleString()}</td>
              <td className="px-4 py-2 text-center">{exam.numQuestions}</td>
              <td className="px-4 py-2 text-center">{exam.k}</td>
              <td className="px-4 py-2 flex gap-3 items-center justify-center min-w-[190px]">
                <button
                  onClick={() => openEditForm(exam)}
                  className="p-2 bg-yellow-100 rounded-full hover:bg-yellow-200 shadow"
                  title="Edit Exam"
                >
                  <FiEdit className="text-yellow-700 text-lg" />
                </button>
                <button
                  onClick={() => deleteExam(exam._id)}
                  className="p-2 bg-red-100 rounded-full hover:bg-red-200 shadow"
                  title="Delete Exam"
                >
                  <FaRegTrashAlt className="text-red-600 text-lg" />
                </button>
                <button
                  onClick={() => handleGenerateQRs(exam._id)}
                  className="p-2 bg-indigo-100 rounded-full hover:bg-indigo-200 shadow"
                  title="Generate QR PDFs"
                >
                  <FaRegClone className="text-indigo-600 text-lg" />
                </button>
                <button
                  onClick={() => handleBulkUploadScans(exam._id)}
                  className="p-2 bg-pink-100 rounded-full hover:bg-pink-200 shadow"
                  title="Bulk Upload Scanned PDFs"
                >
                  <FaRegFilePdf className="text-pink-600 text-lg" />
                </button>
                <button
                  title="Initiate Peer Evaluation"
                  onClick={async () => {
                    try {
                      const res = await axios.post(
                        `http://localhost:${PORT}/api/teacher/initiate-evaluation`,
                        { examId: exam._id },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      toastAction(res.data.message || "Evaluation initiated", "success");
                    } catch (err: any) {
                      toastAction(err.response?.data?.message || "Error initiating evaluation", "error");
                    }
                  }}
                  className="p-2 bg-green-100 rounded-full hover:bg-green-200 shadow"
                >
                  <FiSend className="text-green-700 text-lg" />
                </button>
                <button
                  onClick={() => handleUploadAnswerKey(exam._id)}
                  className="p-2 bg-blue-100 rounded-full hover:bg-blue-200 shadow"
                  title="Upload Answer Key PDF"
                >
                  <FaRegFilePdf className="text-blue-700 text-lg" />
                </button>
                <button
                  onClick={() => handleUploadQuestionPaper(exam._id)}
                  className="p-2 bg-orange-100 rounded-full hover:bg-orange-200 shadow"
                  title="Upload Question Paper PDF"
                >
                  <FaRegFilePdf className="text-orange-600 text-lg" />
                </button>
                <button
                  onClick={() => handleGenerateTickets(exam._id)}
                  className="p-2 bg-red-100 rounded-full hover:bg-red-200 shadow"
                  title="Generate Tickets for Pending Evaluations"
                >
                  <FaRegFilePdf className="text-red-600 text-lg" />
                </button>

              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const isFiltered = !!(selectedCourse && selectedBatch);
  const isLoading = isFiltered ? batchLoading : allLoading;
  const data = isFiltered ? exams : allExams;

  return (
    <div className="flex flex-col items-center w-full min-h-screen pt-10 px-6 pb-20"
      style={{ background: "#fdf8f4" /* always light, no dark mode for content box */ }}>
      <h2 className="text-3xl font-extrabold mb-8 text-center text-purple-800">Manage Exams</h2>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Course/Batch/Create Exam controls */}
      <div className="flex flex-row gap-8 mb-10 justify-center items-center w-full max-w-2xl">
        <select
          className="border-2 border-purple-200 px-5 py-2 rounded-xl shadow-sm text-base focus:outline-purple-400 bg-white"
          value={selectedCourse}
          onChange={(e) => { setSelectedCourse(e.target.value); setSelectedBatch(""); }}
        >
          <option value="">Select Course</option>
          {courses.map((c) => (<option key={c._id} value={c._id}>{c.name}</option>))}
        </select>
        <select
          className="border-2 border-purple-200 px-5 py-2 rounded-xl shadow-sm text-base focus:outline-purple-400 bg-white"
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
          disabled={!selectedCourse}
        >
          <option value="">Select Batch</option>
          {courses.find((c) => c._id === selectedCourse)?.batches.map((b) => (<option key={b._id} value={b._id}>{b.name}</option>))}
        </select>
        <button
          className={`px-6 py-2 rounded-xl shadow-md text-white font-bold text-base transition
            ${selectedCourse && selectedBatch
              ? "bg-[#ae36ff] hover:bg-[#8d2bc3] cursor-pointer"
              : "bg-[#d9a8ff] cursor-not-allowed"}
        `}
          onClick={() => { resetForm(); setCreateOpen(true); }}
          disabled={!selectedCourse || !selectedBatch}
        >
          <FiPlus className="inline-block mr-2" /> Schedule Exam
        </button>
        <button
          className="px-4 py-2 rounded-xl shadow-md text-white font-bold text-base bg-green-600 hover:bg-green-700"
          onClick={async () => {
            try {
              const examsToExport = (selectedCourse && selectedBatch) ? exams : allExams;
              const rows: string[] = [];
              const header = ['Exam Title', 'Course', 'Batch', 'Student Name', 'Student Email', 'Submitted At'];
              rows.push(header.join(','));

              for (const exam of examsToExport) {
                // fetch submissions for each exam
                try {
                  const resp = await axios.get(`http://localhost:${PORT}/api/teacher/exams/${exam._id}/submissions`, { headers: { Authorization: `Bearer ${token}` } });
                  const subs = resp.data.submissions || [];
                  if (subs.length === 0) {
                    // push empty row to indicate no submissions
                    const row = [
                      `"${(exam.title || '').replace(/"/g, '""')}"`,
                      `"${''}"`,
                      `"${''}"`,
                      `"${''}"`,
                      `"${''}"`,
                      `"${''}"`,
                    ];
                    rows.push(row.join(','));
                  } else {
                    for (const s of subs) {
                      const studentName = s.student?.name || '';
                      const studentEmail = s.student?.email || '';
                      const submittedAt = s.submittedAt ? new Date(s.submittedAt).toISOString() : '';
                      const row = [
                        `"${(exam.title || '').replace(/"/g, '""')}"`,
                        `"${''}"`,
                        `"${''}"`,
                        `"${studentName.replace(/"/g, '""')}"`,
                        `"${studentEmail.replace(/"/g, '""')}"`,
                        `"${submittedAt}"`,
                      ];
                      rows.push(row.join(','));
                    }
                  }
                } catch (err) {
                  console.error('Failed to fetch submissions for exam', exam._id, err);
                }
              }

              const csv = rows.join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `teacher_results_export.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toastAction('Export completed', 'success');
            } catch (err) {
              console.error('Export failed', err);
              toastAction('Export failed', 'error');
            }
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Render block for loading, empty, or table */}
      {isLoading ? (
        <div className="text-lg mt-20 py-10 text-center text-gray-400 font-medium">
          Loading...
        </div>
      ) : data.length === 0 ? (
        <div className="text-2xl mt-20 py-10 text-center text-gray-500 font-medium">
          No exam scheduled yet.
        </div>
      ) : (
        <div className="w-full flex justify-center">
          <div className="w-full max-w-6xl">
            {renderExamTable(data)}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <form
            className="bg-white rounded-2xl shadow-xl px-8 py-8 flex flex-col gap-6 w-[600px] max-w-full border-2 border-purple-400 max-h-[90vh] overflow-y-auto"
            onSubmit={handleCreate}
          >
            <h2 className="text-xl font-bold mb-4 text-purple-900 text-center">Schedule Exam</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="font-semibold text-purple-700">Course</label>
                <select
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={selectedCourse}
                  disabled
                >
                  <option>{courses.find(c => c._id === selectedCourse)?.name || ""}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="font-semibold text-purple-700">Batch</label>
                <select
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={selectedBatch}
                  disabled
                >
                  <option>
                    {courses.find(c => c._id === selectedCourse)
                      ?.batches.find(b => b._id === selectedBatch)?.name || ""}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">Exam Name</label>
              <input
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                required
                placeholder="Exam Name"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold text-purple-700">Start Time</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
                <button type="button" className="bg-purple-200 text-purple-800 px-2 rounded" title="Now" onClick={() => setToday(setStartTime)}>Now</button>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">End Time</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
                <button type="button" className="bg-purple-200 text-purple-800 px-2 rounded" title="Now" onClick={() => setToday(setEndTime)}>Now</button>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">Number of Questions</label>
              <input
                type="number"
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                value={numQuestions}
                min={1}
                onChange={e => {
                  const val = Number(e.target.value);
                  setNumQuestions(val);
                  setMaxMarks((old) => {
                    const arr = [...old];
                    if (val > arr.length) {
                      return arr.concat(Array(val - arr.length).fill(0));
                    } else {
                      return arr.slice(0, val);
                    }
                  });
                }}
                required
                placeholder="Enter number of questions"
              />
              <div className="mt-4 space-y-2">
                {Array.from({ length: numQuestions }).map((_, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="font-semibold text-purple-700">Q{idx + 1} Max Marks:</span>
                    <input
                      type="number"
                      className="w-24 border-2 border-purple-400 px-2 py-2 rounded-xl"
                      value={maxMarks[idx] ?? 0}
                      min={0}
                      placeholder={`Q${idx + 1} max marks`}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setMaxMarks(old => {
                          const arr = [...old];
                          arr[idx] = val;
                          return arr;
                        });
                      }}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">No. of Peers (K)</label>
              <input
                type="number"
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                value={k}
                min={1}
                onChange={e => setK(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex gap-4 mt-3 items-center justify-center">
              <button
                type="submit"
                className="bg-[#ae36ff] hover:bg-[#8d2bc3] text-white rounded-xl px-8 py-2 font-semibold"
              >
                Submit
              </button>
              <button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl px-8 py-2 font-semibold"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <form
            className="bg-white rounded-2xl shadow-xl px-8 py-8 flex flex-col gap-6 w-[600px] max-w-full border-2 border-purple-400 max-h-[90vh] overflow-y-auto"
            onSubmit={handleEdit}
          >
            <h2 className="text-xl font-bold mb-4 text-purple-900 text-center">Update Exam</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="font-semibold text-purple-700">Course</label>
                <select
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={selectedCourse}
                  disabled
                >
                  <option>{courses.find(c => c._id === selectedCourse)?.name || ""}</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="font-semibold text-purple-700">Batch</label>
                <select
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={selectedBatch}
                  disabled
                >
                  <option>
                    {courses.find(c => c._id === selectedCourse)
                      ?.batches.find(b => b._id === selectedBatch)?.name || ""}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">Exam Name</label>
              <input
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                required
                placeholder="Title"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="font-semibold text-purple-700">Start Time</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                />
                <button type="button" className="bg-purple-200 text-purple-800 px-2 rounded" title="Now" onClick={() => setToday(setStartTime)}>Now</button>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">End Time</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  required
                />
                <button type="button" className="bg-purple-200 text-purple-800 px-2 rounded" title="Now" onClick={() => setToday(setEndTime)}>Now</button>
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">Number of Questions</label>
              <input
                type="number"
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                value={numQuestions}
                min={1}
                onChange={e => {
                  const val = Number(e.target.value);
                  setNumQuestions(val);
                  setMaxMarks((old) => {
                    const arr = [...old];
                    if (val > arr.length) {
                      return arr.concat(Array(val - arr.length).fill(0));
                    } else {
                      return arr.slice(0, val);
                    }
                  });
                }}
                required
                placeholder="Enter number of questions"
              />
              <div className="mt-4 space-y-2">
                {Array.from({ length: numQuestions }).map((_, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="font-semibold text-purple-700">Q{idx + 1} Max Marks:</span>
                    <input
                      type="number"
                      className="w-24 border-2 border-purple-400 px-2 py-2 rounded-xl"
                      value={maxMarks[idx] ?? 0}
                      min={0}
                      placeholder={`Q${idx + 1} max marks`}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setMaxMarks(old => {
                          const arr = [...old];
                          arr[idx] = val;
                          return arr;
                        });
                      }}
                      required
                    />
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <label className="font-semibold text-purple-700">Upload Question Paper (PDF)</label>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                    onChange={() => { /* not used in this UI */ }}
                  />
              </div>
            </div>
            <div>
              <label className="font-semibold text-purple-700">No. of Peers (K)</label>
              <input
                type="number"
                className="w-full border-2 border-purple-400 px-4 py-2 rounded-xl"
                value={k}
                min={1}
                onChange={e => setK(Number(e.target.value))}
                required
              />
            </div>
            <div className="flex gap-4 mt-3 items-center justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-xl font-semibold"
              >
                Update
              </button>
              <button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl px-8 py-2 font-semibold"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

