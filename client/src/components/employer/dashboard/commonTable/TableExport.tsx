/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable jsx-a11y/no-static-element-interactions */
import axios from "axios";
import React, { useContext, useEffect, useState } from "react";

import { SocketContext } from "../../../../context/socket";

interface Props {
  tableRef: React.MutableRefObject<any>;
  includeDownloadAll: boolean;
  rowToUuid: (row: any) => any;
}

const TableExport: React.FC<Props> = props => {
  const socket = useContext(SocketContext);
  const [progressValue, setProgressValue] = useState(0);
  const [progressHidden, setProgressHidden] = useState(true);

  useEffect(() => {
    socket?.on("export-progress", (progress: { percentage: number }) => {
      setProgressValue(progress.percentage);
      setProgressHidden(false);
    });

    socket?.on("export-complete", (progress: { id: string; filetype: string }) => {
      setProgressValue(0);
      setProgressHidden(true);
      const win = window.open(
        `/api/export?id=${progress.id}&filetype=${progress.filetype}`,
        "_blank"
      );
      win?.focus();
    });
  }, [socket]);

  const downloadHandler = async (filetype: string) => {
    const selectedUUIDs = props.tableRef.current.getSelectedRows().map(props.rowToUuid);

    if (selectedUUIDs.length > 0) {
      await axios.post("/api/export", {
        type: "selected",
        ids: JSON.stringify(selectedUUIDs),
        filetype,
      });
    } else {
      alert("Please choose at least one profile to export");
    }
  };

  const downloadAllHandler = async (filetype: string) => {
    if (
      !window.confirm(
        "Are you sure that you want to export all profiles? This export will take a while to complete."
      )
    )
      return;

    await axios.post("/api/export", {
      type: "all",
      filetype,
    });
  };

  return (
    <div className="field is-grouped" style={{ alignItems: "center" }}>
      <div className="control">
        <div className="dropdown is-hoverable">
          <div className="dropdown-trigger">
            <button className="button">
              <span className="icon is-small">
                <i className="fas fa-download" />
              </span>
              <span>Export</span>
              <span className="icon is-small">
                <i className="fas fa-angle-down" />
              </span>
            </button>
          </div>
          <div className="dropdown-menu far-left">
            <div className="dropdown-content">
              <a className="dropdown-item" onClick={() => downloadHandler("zip")}>
                <span className="icon is-small">
                  <i className="fas fa-file-archive" />
                </span>
                <span>Selected profiles as .zip</span>
              </a>
              <a className="dropdown-item" onClick={() => downloadHandler("csv")}>
                <span className="icon is-small">
                  <i className="fas fa-file-csv" />
                </span>
                <span>Selected profiles as .csv</span>
              </a>
              {/* {{!-- <hr className="dropdown-divider">
							<a className="dropdown-item download-scanned zip">
								<span className="icon is-small">
									<i className="fas fa-file-archive"></i>
								</span>
								<span>All profiles as .zip</span>
							</a>
							<a className="dropdown-item download-scanned csv">
								<span className="icon is-small">
									<i className="fas fa-file-csv"></i>
								</span>
								<span>All profiles as .csv</span>
							</a> --}} */}
              {props.includeDownloadAll && (
                <>
                  <hr className="dropdown-divider" />
                  <a className="dropdown-item" onClick={() => downloadAllHandler("zip")}>
                    <span className="icon is-small">
                      <i className="fas fa-file-archive" />
                    </span>
                    <span>All HackGT profiles as .zip</span>
                  </a>
                  <a className="dropdown-item" onClick={() => downloadAllHandler("csv")}>
                    <span className="icon is-small">
                      <i className="fas fa-file-csv" />
                    </span>
                    <span>All HackGT profiles as .csv</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <progress className="progress" max="100" value={progressValue} hidden={progressHidden} />
    </div>
  );
};

export default TableExport;
