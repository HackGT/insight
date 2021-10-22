/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Column } from "react-table";
import { DateTime } from "luxon";
import axios from "axios";

import { handleAddVisit, generateTag, tagButtonHandler } from "../commonTable/util";
import ParticipantModal from "../commonTable/ParticipantModal";
import Table from "../commonTable/Table";
import TableExport from "../commonTable/TableExport";

const VisitsTable: React.FC = () => {
  // Table filtering states
  const [pageIndex, setPageIndex] = useState(0);

  const [data, setData] = useState<any>({});

  useEffect(() => {
    async function getInitialData() {
      const response = await axios.get("/api/visit", {
        params: {
          page: 0,
        },
      });

      setData(response.data);
    }

    getInitialData();
  }, []);

  const fetchData = useCallback(async () => {
    const response = await axios.get("/api/visit", {
      params: {
        page: pageIndex,
      },
    });

    setData(response.data);
  }, [pageIndex]);

  // Will fetch new data whenever the page index, search query, or tags filter changes
  useEffect(() => {
    fetchData();
  }, [pageIndex]);

  const [detailModalInfo, setDetailModalInfo] = useState<any>(null);
  useEffect(() => {
    if (detailModalInfo) {
      const updatedVisit = data.visits.find((visit: any) => visit._id === detailModalInfo._id);
      if (updatedVisit) {
        setDetailModalInfo(updatedVisit);
      }
    }
  }, [data]);

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        Header: "Time",
        accessor: (row, i) => {
          if (row?.time) {
            const time = new Date(row.time);
            return DateTime.fromJSDate(time).toLocaleString(DateTime.DATETIME_SHORT);
          }

          return "-";
        },
      },
      {
        Header: "Name",
        accessor: (row, i) => row.participantData.name || "",
      },
      {
        Header: "Major",
        accessor: (row, i) => row.participantData.major || "Unknown",
        id: "major",
      },
      {
        Header: "Links",
        accessor: "links",
      },
      {
        Header: "Tags",
        accessor: (row, i) => {
          if (row?.tags) {
            return (
              <div className="field is-grouped is-grouped-multiline">
                {row.tags.map((tag: string) => generateTag(row, tag, fetchData))}
              </div>
            );
          }

          return null;
        },
        id: "tags",
      },
      {
        Header: "Actions",
        accessor: (row, i) => {
          const actions = [];
          if (row?.time) {
            actions.push(
              <button
                className="button tooltip"
                data-tooltip="Star"
                onClick={() => tagButtonHandler(row, "starred", fetchData)}
              >
                <span className="icon">
                  <i className="fas fa-star" />
                </span>
              </button>
            );
            actions.push(
              <button
                className="button tooltip"
                data-tooltip="Flag"
                onClick={() => tagButtonHandler(row, "flagged", fetchData)}
              >
                <span className="icon">
                  <i className="fas fa-flag" />
                </span>
              </button>
            );
            actions.push(
              <button
                className="button tooltip"
                data-tooltip="Add a tag"
                onClick={() => tagButtonHandler(row, "", fetchData)}
              >
                <span className="icon">
                  <i className="fas fa-tag" />
                </span>
              </button>
            );
          } else {
            actions.push(
              <button
                className="button tooltip"
                data-tooltip="Add to visited list"
                onClick={() => handleAddVisit(row, fetchData)}
              >
                <span> Mark as Visited </span>
                <span className="icon">
                  <i className="fas fa-plus" />
                </span>
              </button>
            );
          }

          actions.push(
            <button className="button view-action" onClick={() => setDetailModalInfo(row)}>
              <span>View / Edit</span>
              <span className="icon">
                <i className="fas fa-external-link-alt" />
              </span>
            </button>
          );

          return actions;
        },
        id: "actions",
      },
    ],
    [pageIndex]
  );

  const tableRef = useRef<any>();

  return (
    <>
      <h1 className="title">Visit Information</h1>
      <h6 className="subtitle is-6">
        Here, you can view information about all the participants that have visited your company.
        Feel free to take notes and star people that stand out!
      </h6>
      <TableExport
        tableRef={tableRef}
        rowToUuid={(row: any) => row.original.participantData.uuid}
        includeDownloadAll={false}
      />
      <Table
        columns={columns}
        data={data}
        setPageIndex={setPageIndex}
        ref={tableRef}
        dataField="visits"
      />
      <ParticipantModal
        participant={detailModalInfo?.participantData}
        visitData={detailModalInfo}
        setDetailModalInfo={setDetailModalInfo}
        fetchData={fetchData}
      />
    </>
  );
};

export default VisitsTable;
