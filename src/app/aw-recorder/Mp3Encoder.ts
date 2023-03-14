// @ts-ignore
import { Mp3Encoder as LameMp3Encoder } from "lamejstmp";

interface LameMp3EncoderObj {
  encodeBuffer: (left: Int16Array, right?: Int16Array) => Int8Array;
  flush: () => Int8Array;
}

type Mp3EncoderConfig = {
  bitRate: number;
  sampleRate: number;
  dataBuffer?: Int8Array[];
}

export class Mp3Encoder {
  bitRate: number;
  sampleRate: number;
  dataBuffer: Int8Array[];
  encoder: LameMp3EncoderObj;

  constructor(config: Mp3EncoderConfig) {
    this.bitRate = config.bitRate; // default: 128;
    this.sampleRate = config.sampleRate; // default: 44100;
    this.dataBuffer = config.dataBuffer || [];
    this.encoder = new LameMp3Encoder(1, this.sampleRate, this.bitRate);
  }

  encode(arrayBuffer: Float32Array) {
    const maxSamples = 1152;
    const samples = this._convertBuffer(arrayBuffer);
    let remaining = samples.length;

    for (let i = 0; remaining >= 0; i += maxSamples) {
      const left = samples.subarray(i, i + maxSamples);
      const buffer = this.encoder.encodeBuffer(left);
      this.dataBuffer.push(new Int8Array(buffer));
      remaining -= maxSamples;
    }
  }

  finish(): Int8Array[] {
    this.dataBuffer.push(this.encoder.flush());
    return this.dataBuffer;
  }

  _floatTo16BitPCM(input: Float32Array, output: Int16Array) {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }

  _convertBuffer(arrayBuffer: Float32Array): Int16Array {
    const data = new Float32Array(arrayBuffer);
    const out = new Int16Array(arrayBuffer.length);
    this._floatTo16BitPCM(data, out);
    return out;
  }
}
