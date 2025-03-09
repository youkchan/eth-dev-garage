#!/bin/bash

SLACK_SECRET="$1"
DIFF="$2"

JSON=$(cat <<EOF
{
	"blocks": [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "updating files PR is created"
			}
		}
	]
}
EOF
)

curl -X POST -H 'Content-type: application/json' --data "$JSON" https://hooks.slack.com/services/${SLACK_SECRET}
