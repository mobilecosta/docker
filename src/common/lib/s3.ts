/* eslint-disable @typescript-eslint/ban-ts-ignore */
import { S3 } from 'aws-sdk';
import { ReadStream } from 'fs';

interface Params {
  Bucket: string;
  Key: string;
  Body: ReadStream;
}

export default class S3Operations {
  private s3: S3;

  constructor() {
    if (`${process.env.ENV}` === 'local') {
      this.s3 = new S3({
        apiVersion: '2006-03-01',
        accessKeyId: 'minioadmin',
        secretAccessKey: 'minioadmin',
        region: `${process.env.AWS_REGION}`,
        endpoint: 'http://localhost:9000',
        signatureVersion: 'v4',
        s3ForcePathStyle: true
      });
    } else {
      this.s3 = new S3({
        apiVersion: '2006-03-01',
        region: `${process.env.AWS_REGION}`,
      });
    }
  }

  async get(fileName: string, bucket: string): Promise<S3.GetObjectOutput> {
    const params = {
      Bucket: bucket,
      Key: fileName,
    };

    return this.s3.getObject(params).promise();
  }

  async write(
    data: Record<string, any>,
    fileName: string,
    bucket: string
  ): Promise<S3.PutObjectOutput> {
    const params = {
      Bucket: bucket,
      Body: JSON.stringify(data),
      Key: fileName,
    };

    const newData = await this.s3.putObject(params).promise();

    if (!newData) throw new Error('there was an error writing the file');

    return newData;
  }

  async uploadFile(fileName: string, bucker: string, data: Buffer) : Promise<S3.ManagedUpload.SendData> {
    const params = {
      Bucket: bucker,
      Key: fileName,
      Body: data
    };

    const result = this.s3.upload(params).promise();

    if (!result) throw new Error('there was an error writing the file');

    return result;
  }
}
