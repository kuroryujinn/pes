import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState, useRef, useEffect, useMemo } from 'react';

const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

type Exam = {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  batch: { name: string };
  numQuestions: number;
  maxMarks: number[];
};

type Props = {
  courseId: string;
  onBack: () => void;
  darkMode: boolean;
};

const fetchExams = async (courseId: string): Promise<Exam[]> => {
  const { data } = await axios.get(
    `http://localhost:${PORT}/api/student/courses/${courseId}/exams`,
    {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }
  );
  return data.exams;
};

const formatIST = (utcDate: string) =>
  new Date(utcDate).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const getCountdown = (target: string) => {
  const now = new Date();
  const diff = new Date(target).getTime() - now.getTime();
  if (diff <= 0) return null;

  const totalSecs = Math.floor(diff / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const CourseExams = ({ courseId, onBack, darkMode }: Props) => {
  const { data: exams, isLoading, error } = useQuery({
    queryKey: ['courseExams', courseId],
    queryFn: () => fetchExams(courseId),
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all'|'upcoming'|'ongoing'|'ended'>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filteredExams = useMemo(() => {
    if (!exams) return [];
    return exams.filter(exam => {
      const matchesSearch = !debouncedSearch || (exam.title && exam.title.toLowerCase().includes(debouncedSearch)) || (exam.batch?.name && exam.batch.name.toLowerCase().includes(debouncedSearch));
      const now = new Date();
      const isStarted = new Date(exam.startTime) <= now;
      const isEnded = new Date(exam.endTime) < now;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'upcoming' && !isStarted) || (statusFilter === 'ongoing' && isStarted && !isEnded) || (statusFilter === 'ended' && isEnded);
      return matchesSearch && matchesStatus;
    });
  }, [exams, debouncedSearch, statusFilter]);

  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleButtonClick = (examId: string) => {
    setActiveExamId(examId);
    setUploadMsg(null);
    setSelectedFile(null);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (examId: string) => {
    if (!selectedFile) {
      setUploadMsg('Please select a PDF file.');
      return;
    }
    setUploadMsg('Uploading...');
    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('examId', examId);
      await axios.post(
        `http://localhost:${PORT}/api/student/submit-answer`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setUploadMsg('Submission successful!');
      setActiveExamId(null);
      setSelectedFile(null);
    } catch (err: any) {
      setUploadMsg(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Submission failed.'
      );
    }
  };

  const handleViewExam = async (exam: Exam) => {
    setViewingExam(exam);
    setPdfUrl(null);
    const collapseBtn = document.querySelector('button:has(svg.text-2xl)') as HTMLButtonElement;
    if (collapseBtn) collapseBtn.click();
    try {
      const res = await axios.get(`http://localhost:${PORT}/api/student/question-paper/${exam._id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      setPdfUrl(blobUrl);
    } catch {
      setPdfUrl(null);
    }
  };

  const handleCloseModal = () => {
    setViewingExam(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    const collapseBtn = document.querySelector('button:has(svg.text-2xl)') as HTMLButtonElement;
    if (collapseBtn) collapseBtn.click();
  };

  if (isLoading) return <div className={`text-center p-4 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Loading exams...</div>;
  if (error) return <div className="text-center p-4 text-red-600">Failed to load exams.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button
        className={`px-6 py-3 rounded-xl font-semibold shadow mb-4 w-fit ${darkMode ? "bg-gray-700 text-white" : "bg-gradient-to-r from-gray-700 to-gray-800 text-white"}`}
        onClick={onBack}
      >
        ← Back to Courses
      </button>

        <input
          placeholder="Search exams or batch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`ml-4 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white'}`}
        />

        <select className="ml-auto px-3 py-2 rounded-lg border" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      {filteredExams && filteredExams.map((exam) => {
        const isStarted = new Date(exam.startTime) <= now;
        const isEnded = new Date(exam.endTime) < now;
        const canSubmit = isStarted && !isEnded;
        const countdownText = !isStarted
          ? `Starts in ${getCountdown(exam.startTime)}`
          : !isEnded
            ? `Ends in ${getCountdown(exam.endTime)}`
            : null;

        return (
          <div
            key={exam._id}
            className={`rounded-2xl p-6 shadow border transition-all relative ${darkMode ? "bg-[#1A1A2E] text-white border-gray-700" : "bg-white text-gray-800 border-gray-200"}`}
          >
            <h3 className="text-xl font-bold mb-2">{exam.title}</h3>
            <p className="text-sm mb-1">Batch: {exam.batch?.name}</p>
            <p className="text-sm mb-2">
              ⏰ {formatIST(exam.startTime)} → {formatIST(exam.endTime)}
            </p>
            {countdownText && (
              <p className="text-xs italic text-indigo-500 mb-3">{countdownText}</p>
            )}

            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm mr-2 hover:bg-indigo-700 transition"
              onClick={() => handleViewExam(exam)}
              disabled={!isStarted}
            >
              {isStarted ? "View Questions" : "Locked"}
            </button>

            <button
              className="bg-green-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-green-700 transition"
              onClick={() => handleButtonClick(exam._id)}
              disabled={!canSubmit}
            >
              {isEnded ? "Closed" : isStarted ? "Submit Answers" : "Not Started"}
            </button>

            {activeExamId === exam._id && canSubmit && (
              <div className="mt-3 space-y-2">
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-900 transition"
                  onClick={() => handleSubmit(exam._id)}
                >
                  {selectedFile ? "Upload PDF" : "Choose PDF"}
                </button>
                {selectedFile && (
                  <span className="text-xs text-gray-500 ml-2">{selectedFile.name}</span>
                )}
                {uploadMsg && (
                  <div className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{uploadMsg}</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {viewingExam && (
        <div className="fixed inset-0 z-50 backdrop-blur-sm bg-black/30 flex items-center justify-center px-4">
          <div className={`rounded-xl shadow-xl w-full max-w-6xl h-[90vh] p-6 relative overflow-hidden flex flex-col ${darkMode ? "bg-[#1A1A2E] text-white" : "bg-white text-gray-800"}`}>
            <h3 className="text-lg font-bold text-indigo-500 mb-4">
              {viewingExam.title} – Questions
            </h3>

            <div className="flex-1 flex gap-4 overflow-hidden">
              {pdfUrl ? (
                <div className="flex-1 overflow-auto border border-gray-300 rounded-lg shadow-inner">
                  <iframe
                    src={pdfUrl}
                    title="Question Paper PDF"
                    className="w-full h-full rounded-md"
                    style={{ minHeight: "100%", height: "100%" }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                  PDF not available
                </div>
              )}

              <div className={`w-2/5 overflow-auto pr-2 border rounded-lg shadow-inner p-4 ${darkMode ? "bg-[#121212] text-white border-gray-600" : "bg-gray-50 text-gray-800 border-gray-200"}`}>
                <h4 className="text-sm font-semibold mb-3">
                  Question Max Marks
                </h4>
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  {Array.from({ length: viewingExam.numQuestions }).map((_, idx) => (
                    <li key={idx}>
                      Q{idx + 1} <span className="italic">({viewingExam.maxMarks?.[idx] ?? 0} marks)</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              className="absolute top-4 right-4 text-sm hover:text-red-600"
              onClick={handleCloseModal}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseExams;
