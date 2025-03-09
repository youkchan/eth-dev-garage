#!/bin/bash

SLACK_SECRET="$1"
FILE_NAMES="$2"

JSON=$(cat <<EOF
{
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "<@U08GWAFD8HZ> file structures are changed ${FILE_NAMES}"
			}
		}
	]
}
EOF
)

curl -X POST -H 'Content-type: application/json' --data "$JSON" https://hooks.slack.com/services/${SLACK_SECRET}
