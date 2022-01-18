import setuptools

with open("README.md") as fp:
    long_description = fp.read()

setuptools.setup(
    name="elasticache",
    version="1.0.0",

    description="A sample CDK Python app for ElastiCache",
    long_description=long_description,
    long_description_content_type="text/markdown",

    author="author",

    package_dir={"": "cache"},
    packages=setuptools.find_packages(where="cache"),

    install_requires=[
        "aws-cdk.core==1.122.0",
        "aws-cdk.aws_ec2==1.122.0",
        "aws-cdk.aws_kms==1.122.0",
        "aws-cdk.aws_elasticache==1.122.0",
        "aws-cdk.aws_secretsmanager==1.122.00",
    ],

    python_requires=">=3.7",

    classifiers=[
        "Development Status :: 4 - Beta",

        "Intended Audience :: Developers",

        "Programming Language :: JavaScript",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",

        "Topic :: Software Development :: Code Generators",
        "Topic :: Utilities",

        "Typing :: Typed",
    ],
)
