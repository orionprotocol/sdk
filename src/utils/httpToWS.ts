const httpToWS = (url: string) => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    console.error(`httpToWS: Invalid URL ${url}`);
    throw e;
  }
  if (parsedUrl.protocol === 'https:') {
    parsedUrl.protocol = 'wss:';
  } else if (parsedUrl.protocol === 'http:') {
    parsedUrl.protocol = 'ws:';
  }
  return parsedUrl.toString();
};

export default httpToWS;
