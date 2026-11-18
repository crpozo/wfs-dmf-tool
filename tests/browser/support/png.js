/*
 * Reads the color of a pixel of a PNG, with Node only (no image library): enough for the
 * 8-bit RGBA pictures a canvas exports.
 */
import zlib from 'node:zlib';

export const PNG = {
    decode(buffer) {
        let offset = 8;
        let width = 0;
        let height = 0;
        const chunks = [];
        while (offset < buffer.length) {
            const length = buffer.readUInt32BE(offset);
            const type = buffer.toString('ascii', offset + 4, offset + 8);
            const data = buffer.subarray(offset + 8, offset + 8 + length);
            if (type === 'IHDR') {
                width = data.readUInt32BE(0);
                height = data.readUInt32BE(4);
                if (data[8] !== 8 || data[9] !== 6) {
                    throw new Error('Only 8-bit RGBA PNG images are supported.');
                }
            } else if (type === 'IDAT') {
                chunks.push(data);
            }
            offset += 12 + length;
        }
        const raw = zlib.inflateSync(Buffer.concat(chunks));
        const stride = width * 4;
        const pixels = Buffer.alloc(stride * height);
        for (let y = 0; y < height; y++) {
            const filter = raw[y * (stride + 1)];
            const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
            for (let x = 0; x < stride; x++) {
                const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
                const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
                const upLeft = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
                let value = line[x];
                if (filter === 1) {
                    value += left;
                } else if (filter === 2) {
                    value += up;
                } else if (filter === 3) {
                    value += (left + up) >> 1;
                } else if (filter === 4) {
                    const p = left + up - upLeft;
                    const pa = Math.abs(p - left);
                    const pb = Math.abs(p - up);
                    const pc = Math.abs(p - upLeft);
                    value += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
                }
                pixels[y * stride + x] = value & 255;
            }
        }
        return {
            width,
            height,
            at(x, y) {
                const index = (Math.round(y) * width + Math.round(x)) * 4;
                return [pixels[index], pixels[index + 1], pixels[index + 2]];
            },
        };
    },
};
