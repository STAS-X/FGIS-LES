import { TaskMainProps } from "../../components/TaskList";

export const jsonFetch = (url: string, data: Partial<TaskMainProps>, method: string = 'POST') => {
	return new Promise(function (resolve, reject) {
		fetch(url, {
			method,
			headers: {
				'Content-Type': 'application/json'
			},
			body: method !== 'GET' ? JSON.stringify(data) : null
		})
			.then((res) => {
				if (res.ok) {
					const contentType = res.headers.get('content-type');
					if (contentType && contentType.includes('application/json')) {
						return res.json();
					}
					return reject(`Не JSON, content-type: ${contentType}`);
				}
				return reject(`Статус: ${res.status}`);
			})
			.then((res) => {
				resolve(res);
			})
			.catch((error: Error) => {
				reject(error);
			});
	});
}