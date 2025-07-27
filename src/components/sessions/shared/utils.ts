export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleString(),
  };
};