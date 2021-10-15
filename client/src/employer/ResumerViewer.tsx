import React, { useEffect, useState } from "react";

interface Props {
  participant?: any;
}

const ResumerViewer: React.FC<Props> = props => {
  const [link, setLink] = useState("");

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

        setLink(`/uploads/${json.link}`);
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
  }, [props, props.participant]);

  return <iframe id="detail-resume" src={link} title="Resume" />;
};

export default ResumerViewer;
