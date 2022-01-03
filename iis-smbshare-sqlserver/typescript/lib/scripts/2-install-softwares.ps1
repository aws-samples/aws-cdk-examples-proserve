# Install sql management studio
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
choco install sql-server-management-studio -y

#install code deploy agent
New-Item -Path "c:\temp" -ItemType "directory" -Force
Invoke-WebRequest -Uri "https://aws-codedeploy-us-east-2.s3.amazonaws.com/latest/codedeploy-agent.msi" -Outfile c:\temp\codedeploy-agent.msi 
c:\temp\codedeploy-agent.msi /quiet /l c:\temp\host-agent-install-log.txt