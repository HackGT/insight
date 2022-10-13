/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Column } from "react-table";
import { DateTime } from "luxon";
import axios from "axios";
import { apiUrl, Service, useAuth } from "@hex-labs/core";

import TableFilter from "../commonTable/TableFilter";
import { handleAddVisit, generateTag, tagButtonHandler } from "../commonTable/util";
import ParticipantModal from "../commonTable/ParticipantModal";
import Table from "../commonTable/Table";
import TableExport from "../commonTable/TableExport";

interface Props {
  company: any;
  companyRefetch: any;
}

const ParticipantTable: React.FC<Props> = (props) => {
  // Table filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);

  const [data, setData] = useState<any>({});

  // TODO: use hardcoded hexathon value? Or should allow them to see all participants from 
  // all hexathons they'd sponsored before?
  // use hardcoded hexathon value
  useEffect(() => {
    async function getInitialData() {
      const response = await axios.get(
        apiUrl(Service.REGISTRATION, `/applications/`),
        {
          params: {
            hexathon: process.env.REACT_APP_HEXATHON_ID,
            status: "ACCEPTED"
          },
        });

      setData(response.data);
    }

    getInitialData();
  }, []);

  const fetchData = useCallback(async () => {
    const response = await axios.get(
      apiUrl(Service.REGISTRATION, `/applications/`),
      {
        params: {
          hexathon: process.env.REACT_APP_HEXATHON_ID,
          status: "ACCEPTED",
          search: searchQuery
        },
      });

    setData(response.data);
  }, [searchQuery, pageIndex, tagsFilter]);

  // Will fetch new data whenever the page index, search query, or tags filter changes
  useEffect(() => {
    fetchData();
  }, [pageIndex, searchQuery, tagsFilter]);

  const [detailModalInfo, setDetailModalInfo] = useState<any>(null);
  useEffect(() => {
    if (detailModalInfo) {
      const updatedParticipant = data.participants.find(
        (participant: any) => participant._id === detailModalInfo._id
      );
      if (updatedParticipant) {
        setDetailModalInfo(updatedParticipant);
      }
    }
  }, [data]);

  const columns = useMemo<Column<any>[]>(
    () => [
      {
        Header: "Time",
        accessor: (row, i) => {
          if (row.visitData?.time) {
            const time = new Date(row.visitData.time);
            return DateTime.fromJSDate(time).toLocaleString(DateTime.DATETIME_SHORT);
          }

          return "-";
        },
      },
      {
        Header: "Name",
        accessor: "name",
      },
      {
        Header: "Major",
        accessor: (row, i) => row.major || "Unknown",
        id: "major",
      },
      {
        Header: "Links",
        accessor: "links",
      },
      {
        Header: "Tags",
        accessor: (row, i) => {
          if (row.visitData?.tags) {
            return (
              <div className="field is-grouped is-grouped-multiline">
                {row.visitData.tags.map((tag: string) =>
                  generateTag(row.visitData, tag, fetchData)
                )}
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
          if (row.visitData?.time) {
            actions.push(
              <button
                className="button tooltip"
                data-tooltip="Star"
                onClick={() => tagButtonHandler(row.visitData, "starred", fetchData)}
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
                onClick={() => tagButtonHandler(row.visitData, "flagged", fetchData)}
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
                onClick={() => tagButtonHandler(row.visitData, "", fetchData)}
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
    [searchQuery, pageIndex, tagsFilter]
  );

  const tableRef = useRef<any>();

  return (
    <>
      <h1 className="title">Search</h1>
      <h6 className="subtitle is-6">
        Here, you can search through all the participants at HackGT.
      </h6>
      <TableFilter
        tagsFilter={tagsFilter}
        setTagsFilter={setTagsFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <TableExport
        tableRef={tableRef}
        rowToUuid={(row: any) => row.original.uuid}
        includeDownloadAll
      />
      <Table
        columns={columns}
        data={data}
        setPageIndex={setPageIndex}
        ref={tableRef}
        dataField="participants"
      />
      <ParticipantModal
        participant={detailModalInfo}
        visitData={detailModalInfo?.visitData}
        setDetailModalInfo={setDetailModalInfo}
        fetchData={fetchData}
      />
    </>
  );
};

export default ParticipantTable;
