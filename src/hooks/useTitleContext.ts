import { useContext, useEffect } from "react";
import { TitleContext } from "../contexts/TitleContext";

export const useTitleContext = (props: { value: string }) => {
    const { setTitle } = useContext(TitleContext);
    useEffect(() => {
        setTitle(props.value);
    }, [props.value, setTitle]);
};
