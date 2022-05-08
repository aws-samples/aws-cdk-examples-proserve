import * as http from "http";

type AppSyncEvent = {
  info: {
    fieldName: string
  },
  arguments: {
    key: string
  }
}

export const handler = async (event:  AppSyncEvent): Promise<any> => {
  console.log('event: ');
  console.log(JSON.stringify(event));
  if (event.info.fieldName === 'getAppConfigData') {
    const res: any = await new Promise((resolve) => {
      http.get(
        `http://localhost:2772/applications/${process.env.AWS_APPCONFIG_APPLICATION_ID}/environments/${process.env.AWS_APPCONFIG_ENVIRONMENT_ID}/configurations/${process.env.AWS_APPCONFIG_CONFIGURATION_ID}`,
        resolve
      );
    });

    let configData: any = await new Promise((resolve, reject) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('error', (err: any) => {
        console.log(err);
        reject(err);
      });
      res.on('end', () => resolve(data));
    });

    return JSON.parse(configData);
  }
}
