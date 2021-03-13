/* eslint-disable @typescript-eslint/ban-ts-ignore */
import FormData from 'form-data';
import { S3 } from 'aws-sdk';
import util from 'util';
import stream from 'stream';
import { vindiBankSlip } from '../../../common/lib/external_apis';

const getFileBuffer = async (instance: S3, key: string, bucket: string) => {
  const params = {
    Bucket: bucket,
    Key: key,
  };
  const fileObject: S3.GetObjectOutput = await instance
    .getObject(params)
    .promise();
  return Buffer.from(fileObject.Body!.toString());
};

export const handler = async (event: any) => {
  const s3 = new S3({ region: 'us-east-1', apiVersion: '2006-03-01' });
  const data = await s3.listObjectsV2({ Bucket: 'prod-mpn-cnab' }).promise();
  const pipeline = util.promisify(stream.pipeline);

  const contents = data.Contents;
  try {
    if (!contents) {
      throw new Error('Bucket is empty');
    }
    contents.forEach(async item => {
      const params = {
        Bucket: 'prod-mpn-cnab',
        Key: item.Key!,
      };
      const fileObj = await getFileBuffer(s3, params.Key, params.Bucket);
      // @ts-ignore
      // const buffer = Buffer.from(fileObj.Body?.toString());
      //teste
      const form = new FormData();
      const payment =
        process.env.ENV === 'prod' ? 'online_bank_slip' : 'bank_slip';
      form.append('payment_method_code', payment);
      form.append('batch', fileObj);
      try {
        await (await vindiBankSlip()).post(`/import_batches`, form);
      } catch (error) {
        if (error.response) {
          const response = JSON.stringify(error.response.data);
          throw new Error(`${error.response.status}: ${response}`);
        } else if (error.request) {
          throw new Error(error.request);
        } else {
          throw new Error(error.message);
        }
      }
      await s3.deleteObject(params).promise();
    });
  } catch (error) {
    console.log(error.message);
  }
};
