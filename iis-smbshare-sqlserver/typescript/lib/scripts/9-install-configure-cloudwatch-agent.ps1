# Install the CloudWatch Agent
$zipfile = "AmazonCloudWatchAgent.zip"
$tempDir = Join-Path $env:TEMP "AmazonCloudWatchAgent"
Invoke-WebRequest -Uri "https://s3.amazonaws.com/amazoncloudwatch-agent/windows/amd64/latest/AmazonCloudWatchAgent.zip" -OutFile $zipfile
Expand-Archive -Path $zipfile -DestinationPath $tempDir -Force
cd $tempDir
Write-Host "Trying to uninstall any previous version of CloudWatch Agent"
.\uninstall.ps1

Write-Host "install the new version of CloudWatch Agent"
.\install.ps1

cd "${env:ProgramFiles}\Amazon\AmazonCloudWatchAgent"
Write-Host "Starting CloudWatch Agent"
.\amazon-cloudwatch-agent-ctl.ps1 -a fetch-config -m ec2 -s -c ssm:##replace_with_agent_config_parameter_name##
