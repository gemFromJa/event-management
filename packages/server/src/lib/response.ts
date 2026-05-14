export const error = ({
  code,
  error,
  details = [],
}: {
  code: number;
  error: string;
  details?: { field: string; message: string }[];
}) => {
  return {
    statusCode: code,
    body: JSON.stringify({
      error,
      details,
    }),
  };
};

export const ok = (props: { data: any; message?: string; code: number }) => {
  return {
    statusCode: props.code,
    body: JSON.stringify({
      message: props.message || "Success",
      data: props.data,
    }),
  };
};
