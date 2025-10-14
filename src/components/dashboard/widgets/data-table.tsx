import { memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
}

// Memoized table row component
function TableRowComponentInner<T extends { id: string }>({
  item,
  columns,
  onRowClick,
  getValue
}: {
  item: T;
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  getValue: (item: T, key: keyof T | string) => any;
}) {
  const handleClick = useCallback(() => {
    onRowClick?.(item);
  }, [item, onRowClick]);

  return (
    <TableRow
      className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
      onClick={handleClick}
    >
      {columns.map((column, index) => (
        <TableCell key={index} className={column.className}>
          {column.render
            ? column.render(item)
            : String(getValue(item, column.key) || '')
          }
        </TableCell>
      ))}
    </TableRow>
  );
}

const TableRowComponent = memo(TableRowComponentInner) as typeof TableRowComponentInner;

function DataTableComponent<T extends { id: string }>({
  title, 
  description, 
  data, 
  columns,
  onRowClick 
}: DataTableProps<T>) {
  const getValue = useCallback((item: T, key: keyof T | string) => {
    if (typeof key === 'string' && key.includes('.')) {
      // Handle nested properties like 'user.name'
      return key.split('.').reduce((obj: any, k) => obj?.[k], item);
    }
    return item[key as keyof T];
  }, []);

  // Memoize rendered rows to prevent unnecessary re-renders
  const renderedRows = useMemo(() => {
    return data.map((item) => (
      <TableRowComponent<T>
        key={item.id}
        item={item}
        columns={columns}
        onRowClick={onRowClick}
        getValue={getValue}
      />
    ));
  }, [data, columns, onRowClick, getValue]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderedRows}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Memoized export
export const DataTable = memo(DataTableComponent) as typeof DataTableComponent;