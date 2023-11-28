import { signal } from '@preact/signals'

import type { StateUpdater } from "preact/hooks"
import type { Type as NotificationResponseType } from "./types/notification.ts"
import type { SubjectTypeEnum } from "./types/enums.ts"

export const STATE = {
    input: {
        username: signal<string>("github-notifications"),
        query: signal<string>(""),
        participating: signal<boolean>(true),
        debug: signal<boolean>(false)
    },
    apikey: signal<string>(""),
}


// ----------------------------------------
// model
// ----------------------------------------

export type NotificationType = {
    id: string;
    title: string;
    repository: string;
    url?: string;
    subjectType: SubjectTypeEnum;
    owner: { name: string; avatar_url: string; };
    reason: string;
    updated_at: string;
    last_read_at?: string;
    latest_comment_url?: string;
}


export const REPOSITORY = {
    fetchNotification: async ({ query, participating, setLoading }: { query: string, participating: boolean, setLoading: StateUpdater<boolean> }): Promise<{ raw: NotificationResponseType[], data: NotificationType[] }> => {
        setLoading(() => true);
        let res: Response;
        try {
            res = await CLIENT.fetchNotificationsAPI({ query, participating })
        } finally {
            setLoading(() => false);
        }

        if (res.status !== 200) {
            const errorMessage = await res.text();
            throw new Error(`ng: ${res.status} ${res.statusText}: ${errorMessage}`);
        }

        let rows = await res.json() as NotificationResponseType[];
        if (query !== "") { // 手抜きの query
            // e.g. `is:unread org:encode`
            query.split(/\s+/).forEach((q) => {
                if (q === "") {
                    return
                }

                let [k, v] = q.split(":")
                let isExclude = false;
                if (v.startsWith("-")) {
                    isExclude = true;
                    v = v.slice(1)
                }

                if (k === "is") { // TODO: done,check-suite,commit,gist,release
                    if (v === "unread") {
                        rows = rows.filter((d) => d.unread)
                    } else if (v === "read") {
                        rows = rows.filter((d) => !d.unread)
                    } else if (v === "issue-or-pull-request") {
                        rows = rows.filter((d) => d.subject.type === "Issue" || d.subject.type === "PullRequest")
                    } else if (v === "issue") {
                        rows = rows.filter((d) => d.subject.type === "Issue")
                    } else if (v === "pull-request") {
                        rows = rows.filter((d) => d.subject.type === "PullRequest")
                    } else {
                        throw new Error(`unknown query: ${q}`)
                    }
                } else if (k === "org") {
                    rows = isExclude ? rows.filter((d) => d.repository.owner.login !== v) : rows.filter((d) => d.repository.owner.login === v)
                } else if (k === "repo") {
                    rows = isExclude ? rows.filter((d) => d.repository.full_name !== v) : rows.filter((d) => d.repository.full_name === v)
                } else if (k === "author") {
                    // not supported
                    //  rows = rows.filter((d) => d.subject.latest_comment_url.includes(v))
                } else {
                    // TODO: reason
                    throw new Error(`unknown query: ${q}`)
                }
            })
        }

        return {
            raw: rows, data: rows.map((d: NotificationResponseType): NotificationType => {
                const id = d.id
                const last_read_at = d.last_read_at;
                const latest_comment_url = d.subject.latest_comment_url;
                const title = d.subject.title;
                const repository = d.repository.full_name;
                const subjectType = d.subject.type as SubjectTypeEnum; // TODO: fix
                const url = d.subject.url; // null if d.subject.type === "Discussion"
                const owner = { name: d.repository.owner.login, avatar_url: d.repository.owner.avatar_url };
                return { id, title, repository, url, subjectType, owner: owner, reason: d.reason, updated_at: d.updated_at, last_read_at, latest_comment_url };
            })
        }
    }
}

// ----------------------------------------
// APIClient
// ----------------------------------------

interface IAPIClient {
    fetchNotificationsAPI({ query, participating }: { query: string; participating: boolean }): Promise<Response>;
}

export const apiClient: IAPIClient = {
    fetchNotificationsAPI: async ({ query, participating }: { query: string; participating: boolean }): Promise<Response> => {
        const headers = apiHeaders(STATE.apikey.value);
        let url = "https://api.github.com/notifications";
        const qs = ["per_page=50", "all=false"];
        if (query !== "") {
            qs.push(`query=${encodeURIComponent(query)}`)
        }
        if (participating) {
            qs.push(`participating=${participating}`)
        }
        if (qs.length > 0) {
            url += "?" + qs.join("&")
        }
        // TODO: abort controller
        const res = await fetch(url, { headers });
        return res
    }
}

let CLIENT = apiClient;
export function setAPIClient(client: IAPIClient): IAPIClient {
    const prev = CLIENT;
    CLIENT = client;
    return prev;
}

function apiHeaders(apikey: string): Record<string, string> {
    // https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": `token ${apikey}`,
        "X-GitHub-Api-Version": "2022-11-28"
    };
}
