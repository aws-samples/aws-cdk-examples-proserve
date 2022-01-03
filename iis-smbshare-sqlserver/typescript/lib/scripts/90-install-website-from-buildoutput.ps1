$bucket = '##replace_with_s3_build_output_msi_uri##'
if (-not ([string]::IsNullOrEmpty($bucket))){
    Set-ExecutionPolicy RemoteSigned
    New-Item -Path "c:\temp" -ItemType "directory" -Force
    Invoke-WebRequest -Uri bucket -Outfile c:\temp\build-output.msi 
    c:\temp\build-output.msi /quiet
}