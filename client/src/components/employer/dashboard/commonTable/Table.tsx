/* eslint-disable react/no-unstable-nested-components */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from "react";
import { useTable, usePagination, useRowSelect, Column, Hooks } from "react-table";

const IndeterminateCheckbox = React.forwardRef<any, any>(({ indeterminate, ...rest }, ref) => {
  const defaultRef = React.useRef();
  const resolvedRef = ref || defaultRef;

  React.useEffect(() => {
    // @ts-ignore
    resolvedRef.current.indeterminate = indeterminate;
  }, [resolvedRef, indeterminate]);

  return <input type="checkbox" ref={resolvedRef} {...rest} />;
});

interface Props {
  columns: Column<any>[];
  data: any;
  dataField: string;
  setPageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const Table = forwardRef<any, Props>((props, ref) => {
  const memoizedData = useMemo(() => props.data, [props.data]);
  const memoizedColumns = useMemo(() => props.columns, [props.columns]);

  const dataPageCount = useMemo(
    () => (props.data ? Math.ceil(props.data.total / props.data.pageSize) : 0),
    [props.data]
  );

  const useAddSelectionColumn = useCallback((hooks: Hooks) => {
    hooks.visibleColumns.push(prevColumns => [
      // Let's make a column for selection
      {
        id: "selection",
        // The header can use the table's getToggleAllRowsSelectedProps method
        // to render a checkbox
        Header: ({ getToggleAllPageRowsSelectedProps }) => (
          <div>
            <IndeterminateCheckbox {...getToggleAllPageRowsSelectedProps()} />
          </div>
        ),
        // The cell can use the individual row's getToggleRowSelectedProps method
        // to the render a checkbox
        Cell: ({ row }) => (
          <div>
            <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
          </div>
        ),
      },
      ...prevColumns,
    ]);
  }, []);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    state: { pageIndex },
    prepareRow,
    selectedFlatRows,
  } = useTable(
    {
      columns: memoizedColumns,
      data: memoizedData[props.dataField] || [],
      manualPagination: true,
      initialState: { pageIndex: 0 },
      pageCount: dataPageCount,
    },
    usePagination,
    useRowSelect,
    useAddSelectionColumn
  );

  useImperativeHandle(
    ref,
    () => ({
      getSelectedRows: () => selectedFlatRows,
    }),
    [selectedFlatRows]
  );

  useEffect(() => {
    props.setPageIndex(pageIndex);
  }, [props.setPageIndex, pageIndex]);

  return (
    <>
      <table className="table is-hoverable is-fullwidth" id="search-table" {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                // @ts-ignore
                <th {...column.getHeaderProps()}>{column.render("Header")}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {page.map((row, i) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  // @ts-ignore
                  <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <nav className="pagination is-centered" role="navigation" aria-label="pagination">
        <button
          className="button pagination-previous"
          onClick={() => gotoPage(0)}
          disabled={!canPreviousPage}
        >
          {"<<"}
        </button>
        <button
          className="button pagination-previous"
          onClick={() => previousPage()}
          disabled={!canPreviousPage}
        >
          {"<"}
        </button>
        <div className="pagination-list">
          <span style={{ marginRight: "6px" }}>
            Page{" "}
            <strong>
              {pageIndex + 1} of {Math.max(1, pageOptions.length)}
            </strong>
          </span>
          <span> | Go to page: </span>
          <input
            className="input is-small"
            type="number"
            defaultValue={pageIndex + 1}
            onChange={e => {
              const newPage = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(newPage);
            }}
            style={{ width: "100px" }}
          />
        </div>
        <button
          className="button pagination-next"
          onClick={() => nextPage()}
          disabled={!canNextPage}
        >
          {">"}
        </button>
        <button
          className="button pagination-next"
          onClick={() => gotoPage(pageCount - 1)}
          disabled={!canNextPage}
        >
          {">>"}
        </button>
      </nav>
    </>
  );
});

export default Table;
