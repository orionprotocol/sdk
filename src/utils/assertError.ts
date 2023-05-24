
export default function assertError(errorCandidate: unknown): asserts errorCandidate is Error {
  if (!(errorCandidate instanceof Error)) {
    throw Error(`Assertion failed: errorCandidate is not an Error. Content: ${JSON.stringify(errorCandidate)}`);
  }
}
