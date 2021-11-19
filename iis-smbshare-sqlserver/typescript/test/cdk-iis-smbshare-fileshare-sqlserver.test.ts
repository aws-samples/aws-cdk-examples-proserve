import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CdkWindowsAdFileshareSqlserver from '../lib/cdk-iis-smbshare-fileshare-sqlserver';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkWindowsAdFileshareSqlserver.CdkIISSmbShareSqlserverStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
