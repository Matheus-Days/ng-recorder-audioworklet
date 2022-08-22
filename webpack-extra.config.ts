import * as webpack from 'webpack';
import { CustomWebpackBrowserSchema, TargetOptions } from '@angular-builders/custom-webpack';
//@ts-ignore
import WorkerUrlPlugin from 'worker-url/plugin';


export default (config: webpack.Configuration, options: CustomWebpackBrowserSchema, targetOptions: TargetOptions) => {
  
  config.plugins?.push(new WorkerUrlPlugin())

  return config;
};
