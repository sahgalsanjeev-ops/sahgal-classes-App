import { useSearchParams } from "react-router-dom";
import PDFViewer from "@/components/PDFViewer";

const NotesPage = () => {
  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") || "Study Notes";
  const pdfUrl = searchParams.get("pdf") || "";

  return <PDFViewer title={title} pdfUrl={pdfUrl} />;
};

export default NotesPage;
