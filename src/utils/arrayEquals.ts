const arrayEquals = (a: unknown[], b: unknown[]) => a.length === b.length
    && a.every((value, index) => value === b[index]);

export default arrayEquals;
