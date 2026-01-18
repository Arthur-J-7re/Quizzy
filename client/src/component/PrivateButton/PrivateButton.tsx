import { Switch } from "@mui/material"

export default function PrivateButton(
    {
        entity,
        setEntity
    } : {
        entity : {
            private: boolean
        },
        setEntity : Function
    }
) {
    const setPrivate = (bool : boolean) => {
        setEntity({
            ...entity,
            private: bool,
        })
    }

    const changePrivate = () => {
        var bool = entity.private;
        setPrivate(!bool)
    }
    return (
        <div className='privateswitch'>
            <label className='questionCreation-label' onClick={() => setPrivate(false)}>Public</label>
            <Switch
                type='checkboxe'
                checked={entity.private}
                className='isPrivate'
                onClick={() => changePrivate()}
            />
            <label className='questionCreation-label' onClick={() => setPrivate(true)}>Privée</label>
        </div>
    )
}