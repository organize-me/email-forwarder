import { Stream, Writable } from "stream";

export const asyncPipe = async (from: Stream, to: Writable) => new Promise<void>((resolve, reject) => {
    from.on("end", () => {
        resolve()
    })
    from.on("error", (e: Error) => {
        reject(e)
    })

    from.pipe(to)
})