const httpToWS = (url: string) => {
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol === 'https:') {
    parsedUrl.protocol = 'wss:';
  } else if (parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'ws:';
  }
  return parsedUrl.toString();
};

export default httpToWS;
