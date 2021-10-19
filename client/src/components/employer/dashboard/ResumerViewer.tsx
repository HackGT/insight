/* eslint-disable @typescript-eslint/no-shadow */
import React, { useEffect, useState } from "react";
// import { Document, Page, pdfjs } from "react-pdf";
import PDFContainer from "./PDFContainer";

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Props {
  participant?: any;
  setResumeDownloadLink: (url: string) => void;
}

const ResumerViewer: React.FC<Props> = props => {
  const [link, setLink] = useState({
    url: "",
    withCredentials: false,
  });

  useEffect(() => {
    // Get a time-limited public link to the resume for use with Google / Microsoft viewer
    const options: RequestInit = {
      method: "GET",
      credentials: "include",
    };

    async function getResumeLink() {
      if (!props.participant?.resume) return;

      try {
        const response = await fetch(`/${props.participant.resume?.path}?public=true`, options);
        const json = await response.json();

        if (!json.success) {
          alert(json.error);
        }

        // setLink(`localhost:3000/uploads/${json.link}&download=true`);
        props.setResumeDownloadLink(`${process.env.HOST_URL}/uploads/${json.link}&download=true`);
        setLink({
          url: `${new URL(window.location.href).origin}/uploads/${json.link}&download=true`,
          withCredentials: true,
        });

        // if (props.participant.resume.path.toLowerCase().indexOf(".doc") !== -1) {
        //   // Special viewer for Word documents
        //   this.resume.src = `${link}`;
        // } else {
        //   // Google Drive Viewer supports a bunch of formats including PDFs, Pages, images
        //   this.resume.src = `${link}`;
        // }
      } catch (err) {
        console.log(err);
      }
    }

    getResumeLink();
  }, [props, link, props.participant]);
  return (
    <div
      style={{
        marginTop: "1rem",
      }}
    >
      <PDFContainer link={link} />
      <a className="button is-info" href={link.url} download>
        <span className="icon is-small">
          <i className="fas fa-plus" />
        </span>
        <span>Download Resume</span>
      </a>
    </div>
  );
};

export default ResumerViewer;
