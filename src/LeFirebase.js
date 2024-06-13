import {ARRAY} from '@lowentry/utils';
import {initializeApp} from 'firebase/app';
import {initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc} from 'firebase/firestore';
import {getAuth, signOut} from 'firebase/auth';
import {getAnalytics} from 'firebase/analytics';
import {getPerformance, trace} from 'firebase/performance';
import {useDocument, useDocumentData} from 'react-firebase-hooks/firestore';
import {useAuthState} from 'react-firebase-hooks/auth';


export const setup = (config) =>
{
	const app = initializeApp(config);
	const store = (() =>
	{
		try
		{
			return initializeFirestore(app, {
				localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()}),
			});
		}
		catch(e)
		{
			console.error(e);
			return getFirestore(app);
		}
	})();
	const analytics = getAnalytics(app);
	const performance = getPerformance(app);
	const auth = getAuth(app);
	
	
	const createTraceEvent = (name) =>
	{
		const event = trace(performance, name);
		let started = false;
		let stopped = false;
		return {
			data:event,
			
			start:
				() =>
				{
					started = true;
					event.start();
				},
			startOnce:
				() =>
				{
					if(!started)
					{
						started = true;
						event.start();
					}
				},
			
			stop:
				() =>
				{
					stopped = true;
					event.stop();
				},
			stopOnce:
				() =>
				{
					if(!stopped)
					{
						stopped = true;
						event.stop();
					}
				},
			
			record:
				(startTime, duration, options) =>
				{
					stopped = true;
					event.record(startTime, duration, options);
				},
			recordOnce:
				(startTime, duration, options) =>
				{
					if(!stopped)
					{
						stopped = true;
						event.record(startTime, duration, options);
					}
				},
			
			cancel:
				() =>
				{
					stopped = true;
				},
		};
	};
	
	const traceEvents = {};
	const traces = new Proxy(traceEvents, {
		get:(target, key) =>
		    {
			    if(!(key in traceEvents))
			    {
				    traceEvents[key] = createTraceEvent(key);
			    }
			    return traceEvents[key];
		    },
	});
	
	
	return {
		firebase:{app, store, analytics, performance, traces, auth, signOut:() => signOut(auth)},
		
		useAuthState:
			(...args) => useAuthState(auth, ...args),
		
		useDocument:
			(path, options) => useDocument(doc(store, ...path), options),
		
		useDocumentData:
			(path, options) => useDocumentData(doc(store, ...path), options),
		
		setDocument:
			(path, data, onlyUpdateFields) => setDoc(doc(store, ...path), data, {}),
		
		updateDocument:
			(path, data, onlyUpdateFields) => setDoc(doc(store, ...path), data, onlyUpdateFields ? {mergeFields:ARRAY(onlyUpdateFields)} : {merge:true}),
	};
};
