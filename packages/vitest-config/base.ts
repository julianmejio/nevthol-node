export const config = {
    test: {
        resolve: {
            tsconfigPaths: true,
        },
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
};