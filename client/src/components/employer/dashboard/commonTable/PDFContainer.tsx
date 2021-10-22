/* eslint-disable prefer-destructuring */
import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

interface PDFProps {
  url: string;
  withCredentials: boolean;
}

interface Props {
  link: PDFProps;
}

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// eslint-disable-next-line @typescript-eslint/ban-types
const PDFContainer: React.FC<Props> = props => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const link = props.link;

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function onDocumentLoadSuccess({ numPages }: any) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function changePage(offset: any) {
    setPageNumber(prevPageNumber => prevPageNumber + offset);
  }

  function previousPage() {
    changePage(-1);
  }

  function nextPage() {
    changePage(1);
  }
  console.log(link);
  return (
    <>
      <Document file={link} onLoadSuccess={onDocumentLoadSuccess}>
        <Page pageNumber={pageNumber} />
      </Document>
      <div>
        <p>
          Page {pageNumber || (numPages ? 1 : "--")} of {numPages || "--"}
        </p>
        <button
          className="button is-info"
          type="button"
          disabled={pageNumber <= 1}
          onClick={previousPage}
        >
          Previous
        </button>
        <button
          className="button is-info"
          style={{ marginLeft: "1rem", marginBottom: "1rem" }}
          type="button"
          disabled={pageNumber >= numPages}
          onClick={nextPage}
        >
          Next
        </button>
      </div>
    </>
  );
};

export default PDFContainer;
